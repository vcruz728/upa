<?php

namespace App\Http\Controllers\Oficios;
use Inertia\Inertia;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Oficios\Oficio;
use App\Models\Catalogos\Des;
use App\Models\Catalogos\Areas;
use App\Models\Catalogos\Procesos;
use Illuminate\Support\Facades\Mail;
use App\Mail\Oficios\Nuevo;
use App\Models\User;
use DB;

class RecepcionController extends Controller
{
    public function index()
	{
    	$oficios = Oficio::select(
			DB::raw("CASE 
			WHEN DATEDIFF ( MINUTE, convert(varchar, oficios.created_at, 120)  , convert(varchar, fecha_respuesta, 120) ) < 4320 AND fecha_respuesta IS NOT NULL THEN '#5fd710'
			WHEN DATEDIFF ( MINUTE, convert(varchar, oficios.created_at, 120)  , convert(varchar, getdate(), 120) ) < 4320 AND fecha_respuesta IS NULL THEN '#f5f233'
			WHEN DATEDIFF ( MINUTE, convert(varchar, oficios.created_at, 120)  , convert(varchar, getdate(), 120) ) > 4320 AND fecha_respuesta IS NULL THEN '#f98200'
			WHEN DATEDIFF ( MINUTE, convert(varchar, oficios.created_at, 120)  , convert(varchar, fecha_respuesta, 120) ) > 4320 AND fecha_respuesta IS NOT NULL THEN '#ff2d2d'
			ELSE '#000000' END as color"),
			DB::raw("CONCAT( RIGHT('0'+cast(DAY(oficios.created_at) as varchar(2)),2) ,' de ', dbo.fn_GetMonthName (oficios.created_at, 'Spanish'),' de ',YEAR(oficios.created_at),' a las ', CONVERT(VARCHAR(5),oficios.created_at,108)) as f_ingreso"),
    		'oficios.id',
    		'ingreso',
    		'num_folio',
    		'num_oficio',
    		DB::raw(" CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio "),
    		'cat_des.nombre as des',
    		'cat_areas.nombre as area',
    		'cat_procesos.nombre as proceso',
    		'dep_ua',
			'area as id_area',
			'proceso_impacta',
			'descripcion',
			'oficios.archivo',
			'oficios.archivo_respuesta',
			'oficios.oficio_final',
			DB::raw("RIGHT(oficios.archivo_respuesta, 3) as extension"),

    	)
    	->join('cat_des','cat_des.id','oficios.dep_ua')
    	->join('cat_areas','cat_areas.id','oficios.area')
    	->join('cat_procesos','cat_procesos.id','oficios.proceso_impacta')
    	->orderBy('oficios.id')
    	->get();

    	return Inertia::render('Oficios/Recepcion', [
            'status' => session('status'),
            'oficios' => $oficios
        ]);
    }

    public function altaOficio($id = 0)
	{
    	$oficio = Oficio::select(
    		'oficios.id',
    		'ingreso',
    		'num_folio',
    		'num_oficio',
    		'cat_des.nombre as des',
    		'cat_areas.nombre as area',
    		'cat_procesos.nombre as proceso',
    		'dep_ua',
			'area as id_area',
			'proceso_impacta',
			'descripcion',
			'archivo'

    	)
    	->join('cat_des','cat_des.id','oficios.dep_ua')
    	->join('cat_areas','cat_areas.id','oficios.area')
    	->join('cat_procesos','cat_procesos.id','oficios.proceso_impacta')
    	->where('oficios.id', $id)
    	->first();

    	$procesos = Procesos::getSelForArea($id);

    	return Inertia::render('Oficios/FormOficios', [
            'status' => session('status'),
            'des' => Des::getSel(),
            'areas' => Areas::getSel(),
            'oficio' => $oficio,
            'procesos' => $procesos
        ]);
    }

    public function save(Request $request)
	{
		
		if(isset($request->id)){
			$ofi = Oficio::find($request->id);
			$regla = 'nullable';
			$evidencia = $ofi->archivo;
		}else{
    		$ofi = new Oficio();
    		$regla = 'required';
		}

    	$request->validate([
    		'ingreso' => 'required',
			'num_oficio' => 'required_if:ingreso,Físico',
			'num_folio' => 'required_if:ingreso,Email',
			'dep_ua' => 'required',
			'area' => 'required',
			'proceso_impacta' => ($request->area == 1 ? 'nullable' : 'required'),
			'archivo' => $regla.'|mimes:pdf|max:4096',
			'descripcion' => 'required|min:2|max:1000',
        ]);

		if($request->file('archivo')){
			if($ofi->archivo != ''){
				\Storage::disk('files')->delete($ofi->archivo);
			}

	    	$evidencia = 'oficios/'.time()."_".\Auth::user()->id."_".$request->archivo->getClientOriginalName();
			$path = \Storage::disk('files')->put($evidencia, \File::get($request->archivo));
		}

    	$ofi->ingreso = $request->ingreso;
	    $ofi->num_oficio = $request->num_oficio;
	    $ofi->num_folio = $request->num_folio;
	    $ofi->dep_ua = $request->dep_ua;
	    $ofi->area = $request->area;
	    $ofi->proceso_impacta = $request->proceso_impacta;
	    $ofi->descripcion = $request->descripcion;
		$ofi->archivo = $evidencia;
		$ofi->save();

        $folio = $request->ingreso == 'Email' ? $request->num_folio : $request->num_oficio;

        
		if($request->area != "1"){
			$datosOfi = Oficio::select('cat_procesos.nombre as proceso', 'cat_areas.nombre as area', 'cat_des.nombre as des', 'descripcion', 'ingreso')->join('cat_des','cat_des.id','oficios.dep_ua')->join('cat_procesos','cat_procesos.id','oficios.proceso_impacta')->join('cat_areas','cat_areas.id', 'oficios.area')->where('oficios.id', $ofi->id)->first();
			$descriponI = "<ul><li><strong>Ingreso de la solicitud</strong>: ".$datosOfi->ingreso."</li><li><strong>Dependencia o Unidad Académica</strong>: ".$datosOfi->des."</li><li><strong>Área responsable</strong>: ".$datosOfi->area."</li><li><strong>Proceso al que impacta</strong>: ".$datosOfi->proceso."</li></ul>";
			
			if(!isset($request->id)){
				$usuario = User::where('rol', 3)->where('id_area', $request->area)->first();
				iBitacoraOficio($ofi->id,"Recepción de oficio: $folio", $descriponI, "fa fa-file-o", "success");

				if(!empty($usuario)){
					Mail::to($usuario->email)->later(now()->addSeconds(2), new Nuevo($usuario->name, $folio, $evidencia));
				}
			}else{  
				iBitacoraOficio($ofi->id,"Edición oficio: $folio", $descriponI, "fe fe-edit", "warning");
			}
		}


		return back()->with('status', "Oficio guardado correctamente");
    }


}
