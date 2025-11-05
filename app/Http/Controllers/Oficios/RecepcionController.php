<?php

namespace App\Http\Controllers\Oficios;

use Inertia\Inertia;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Oficios\Oficio;
use App\Models\Oficios\ArchivoOficio;
use App\Models\Catalogos\Des;
use App\Models\Catalogos\Areas;
use App\Models\Catalogos\Procesos;
use Illuminate\Support\Facades\Mail;
use App\Mail\Oficios\Nuevo;
use App\Models\User;
use DB;
use App\Models\Oficios\Nuevo as NuevoOficio;
use App\Helpers\TiempoHabil;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use App\Support\FilenameSanitizer as FS;


class RecepcionController extends Controller
{
	private function semaforoOficio(?string $createdAt, ?string $fechaRespuesta, int $minutosOficio): array
	{
		// Convierte minutos a horas de SLA (redondeo hacia arriba)
		$horas = (int) ceil(max($minutosOficio, 0) / 60);

		$inicio = Carbon::parse($createdAt ?? now('UTC'));
		$vence  = TiempoHabil::sumarHorasExcluyendoDescansos($inicio, $horas, true);

		if (!empty($fechaRespuesta)) {
			$resp = Carbon::parse($fechaRespuesta);
			if ($resp->lte($vence)) {
				return [1, '#5fd710', $vence]; // Verde: cumplido a tiempo
			}
			return [4, '#ff2d2d', $vence];     // Rojo: fuera de tiempo
		}

		if (now()->lte($vence)) {
			return [2, '#f5f233', $vence];     // Amarillo: en tiempo
		}
		return [3, '#f98200', $vence];         // Naranja: vencido sin respuesta
	}

	public function index()
	{
		// --- agregados auxiliares para NUEVOS (respetando eliminados) ---
		$destAgg = DB::table('destinatarios_oficio as d')
			->leftJoin('directorios as dir', 'dir.id', '=', 'd.id_usuario')
			->leftJoin('cat_destinatarios_externos as ext', 'ext.id', '=', 'd.id_usuario')
			->whereNull('d.deleted_at') // << IMPORTANTE: no contar eliminados
			->groupBy('d.id_oficio')
			->selectRaw("
        d.id_oficio,
        COUNT(*) AS total_dest,
        STRING_AGG(CAST(d.folio AS varchar(10)), ', ') AS folios,
        MAX(d.folio) AS folio,
        CASE
            WHEN COUNT(*) = 1
                 THEN MAX(CASE WHEN d.tipo_usuario = 1 THEN dir.nombre
                               WHEN d.tipo_usuario = 2 THEN ext.nombre
                          END)
            ELSE 'Multi Destinatario'
        END AS nombre_desti
    ");

		$foliosAgg = DB::table('destinatarios_oficio')
			->whereNull('deleted_at')   // << IMPORTANTE: no contar eliminados
			->groupBy('id_oficio')
			->selectRaw("
        id_oficio,
        COUNT(folio) as total,
        STRING_AGG(CAST(folio AS VARCHAR(50)), ', ') as folios,
        MAX(folio) as folio
    ");

		$oficios = Oficio::select(

			DB::raw("CONCAT(
				RIGHT('0'+cast(DAY(oficios.created_at) as varchar(2)),2),
				' de ', dbo.fn_GetMonthName (oficios.created_at, 'Spanish'),
				' de ', YEAR(oficios.created_at),
				' ', CONVERT(VARCHAR(5),oficios.created_at,108)
			) as f_ingreso"),

			// ✅ timestamps crudos para cálculo en PHP
			DB::raw("CONVERT(VARCHAR(19), oficios.created_at, 120) as f_ingreso_raw"),
			DB::raw("CONVERT(VARCHAR(19), oficios.fecha_respuesta, 120) as f_respuesta_raw"),
			DB::raw("cat_areas.minutos_oficio as sla_min"),

			'oficios.id',
			'ingreso',
			'num_folio',
			'num_oficio',
			DB::raw("CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio"),
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
			'respuestas_oficio.respuesta as asunto'
		)
			->join('cat_des', 'cat_des.id', 'oficios.dep_ua')
			->join('cat_areas', 'cat_areas.id', 'oficios.area')
			->leftJoin('respuestas_oficio', 'respuestas_oficio.id_oficio', 'oficios.id')
			->join('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')
			->orderBy('oficios.created_at', 'desc')
			->get();

		$oficios = $oficios->map(function ($o) {
			[$estatus, $color, $vence] = $this->semaforoOficio(
				$o->f_ingreso_raw ?? null,
				$o->f_respuesta_raw ?? null,
				(int) ($o->sla_min ?? 4320) // fallback 72h = 4320 minutos
			);

			$o->estatus_valor = $estatus;
			$o->color         = $color;
			$o->vence_real    = $vence->format('Y-m-d H:i:s'); // útil para la UI

			return $o;
		});

		// Informativos (area = 1)
		$informativos = Oficio::select(
			DB::raw("CONCAT( RIGHT('0'+cast(DAY(oficios.created_at) as varchar(2)),2) ,' de ', dbo.fn_GetMonthName (oficios.created_at, 'Spanish'),' de ',YEAR(oficios.created_at),' ', CONVERT(VARCHAR(5),oficios.created_at,108)) as f_ingreso"),
			DB::raw("CONVERT(VARCHAR(19), oficios.created_at, 120) as f_ingreso_raw"),
			'oficios.id',
			'ingreso',
			'num_folio',
			'num_oficio',
			DB::raw(" CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio "),
			'area as id_area',
			'descripcion',
			'oficios.archivo',
		)
			->orderBy('oficios.created_at', 'desc')
			->where('area', 1)
			->get();

		// --- NUEVOS OFICIOS (Recepción) ---
		$nuevos = NuevoOficio::query()
			->from('nuevos_oficios')
			->select([
				'nuevos_oficios.id',
				'cat_areas.nombre as area',
				'nuevos_oficios.nombre as destinatario',
				'nuevos_oficios.archivo_respuesta',
				'enviado',
				'finalizado',
				'revision',
				'id_usuario',
				'descripcion_rechazo_jefe',
				'descripcion_rechazo_final',
				'archivo',
				'masivo',

				// Folio con 3 niveles: oficio_respuesta -> folios de destinatarios -> folios_masivos
				DB::raw("
            COALESCE(
                NULLIF(LTRIM(RTRIM(CAST(nuevos_oficios.oficio_respuesta AS VARCHAR(200)))), ''),
                NULLIF(LTRIM(RTRIM(
                    CASE 
                      WHEN folios.total = 1 THEN CAST(folios.folio AS VARCHAR(200))
                      ELSE folios.folios 
                    END
                )), ''),
                NULLIF(LTRIM(RTRIM(nuevos_oficios.folios_masivos)), '')
            ) AS oficio_respuesta
        "),

				// Forzar 'Grupal' cuando es masivo; en caso contrario, nombre agregado (respetando eliminados)
				DB::raw("
            CASE 
                WHEN nuevos_oficios.masivo = 1 THEN 'Grupal'
                ELSE COALESCE(dest.nombre_desti, '')
            END AS nombre_desti
        "),

				DB::raw("CONCAT(
            RIGHT('0'+cast(DAY(nuevos_oficios.created_at) as varchar(2)),2),
            ' de ', dbo.fn_GetMonthName (nuevos_oficios.created_at, 'Spanish'),
            ' de ', YEAR(nuevos_oficios.created_at),
            ' ', CONVERT(VARCHAR(5),nuevos_oficios.created_at,108)
        ) as f_ingreso"),
				DB::raw("CONVERT(VARCHAR(19), nuevos_oficios.created_at, 120) as f_ingreso_raw"),

				DB::raw("RIGHT(nuevos_oficios.archivo_respuesta, 3) as extension"),
				DB::raw("COALESCE(respuesta, descripcion) as respuesta"),

				// (opcional) bandera para UI
				DB::raw('CASE WHEN nuevos_oficios.masivo = 1 THEN 1 ELSE 0 END AS es_masivo'),
			])
			->join('cat_areas', 'cat_areas.id', 'nuevos_oficios.id_area')
			->leftJoinSub($destAgg, 'dest', function ($join) {
				$join->on('dest.id_oficio', '=', 'nuevos_oficios.id');
			})
			->leftJoinSub($foliosAgg, 'folios', function ($join) {
				$join->on('folios.id_oficio', '=', 'nuevos_oficios.id');
			})
			->whereNotNull('nuevos_oficios.archivo_respuesta')
			->orderBy('nuevos_oficios.created_at', 'desc')
			->get();

		// --- Post-proceso oficio_respuesta: no romper rangos ya formados ---
		$nuevos = $nuevos->map(function ($item) {
			$val = trim((string)($item->oficio_respuesta ?? ''));

			if ($val === '') {
				return $item;
			}

			// Si ya viene como rango puro (e.g. "2320-2330") y no hay comas, dejar tal cual
			if (strpos($val, ',') === false && strpos($val, '-') !== false) {
				$item->oficio_respuesta = $val;
				return $item;
			}

			// Lista separada por comas -> normalizar y convertir a rangos
			$folios = array_map('trim', explode(',', $val));
			$folios = array_values(array_filter($folios, fn($x) => ctype_digit($x)));

			if (count($folios) === 0) {
				$item->oficio_respuesta = $val; // nada numérico; deja el original
				return $item;
			}

			sort($folios, SORT_NUMERIC);

			if (count($folios) <= 5) {
				$item->oficio_respuesta = implode(', ', $folios);
				return $item;
			}

			// Compactar a rangos
			$rango = [];
			$inicio = $prev = null;
			foreach ($folios as $folioStr) {
				$folio = (int)$folioStr;
				if ($inicio === null) {
					$inicio = $prev = $folio;
					continue;
				}
				if ($folio === $prev + 1) {
					$prev = $folio;
					continue;
				}
				$rango[] = ($inicio === $prev) ? (string)$inicio : ($inicio . '-' . $prev);
				$inicio = $prev = $folio;
			}
			if ($inicio !== null) {
				$rango[] = ($inicio === $prev) ? (string)$inicio : ($inicio . '-' . $prev);
			}

			$item->oficio_respuesta = implode(', ', $rango);
			return $item;
		});
		return Inertia::render('Oficios/Recepcion', [
			'status' => session('status'),
			'oficios' => $oficios,
			'informativos'  => $informativos,
			'nuevoHistorico' => $nuevos
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
			->join('cat_des', 'cat_des.id', 'oficios.dep_ua')
			->join('cat_areas', 'cat_areas.id', 'oficios.area')
			->join('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')
			->where('oficios.id', $id)
			->first();

		$procesos = Procesos::getSelForArea($id);

		$archivos = ArchivoOficio::where('id_oficio_inicial', $id)
			->get()
			->map(function ($archivo) {
				$extension = pathinfo($archivo->archivo, PATHINFO_EXTENSION);

				if ($extension == "pdf" || $extension == "jpg" || $extension == "jpeg" || $extension == "png") {
					$url = $archivo->archivo;
				} else {
					$url = asset("files/" . $archivo->archivo);
				}


				return [
					'serverId' => $archivo->id,
					'origin' => 1,
					'source' => $archivo->id,
					'file' => $archivo->archivo,
					'options' => [
						'type' => 'local',
						'file' => [
							'name' => $archivo->nombre,
							'size' => \Storage::disk('files')->exists($archivo->archivo) ? \Storage::disk('files')->size($archivo->archivo) : 0,
							'type' => mime_content_type(\Storage::disk('files')->path($archivo->archivo)),
						],
						'metadata' => [
							'url' => $url,
							'extension' => $extension,
						],
					],
				];
			});

		return Inertia::render('Oficios/FormOficios', [
			'status' => session('status'),
			'des' => Des::getSel(),
			'areas' => Areas::getSel(),
			'oficioInicial' => $oficio,
			'procesos' => $procesos,
			'files' => $archivos
		]);
	}

	/* 	public function save(Request $request)
	{

		if (isset($request->id)) {
			$ofi = Oficio::find($request->id);
			$regla = 'nullable';
			$evidencia = $ofi->archivo;
		} else {
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
			'archivo' => $regla . '|mimes:pdf|max:4096',
			'descripcion' => 'required|min:2|max:1000',
		]);

		if ($request->file('archivo')) {
			if ($ofi->archivo != '') {
				\Storage::disk('files')->delete($ofi->archivo);
			}

			$evidencia = 'oficios/' . time() . "_" . \Auth::user()->id . "_" . $request->archivo->getClientOriginalName();
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


		if ($request->area != "1") {
			$datosOfi = Oficio::select('cat_procesos.nombre as proceso', 'cat_areas.nombre as area', 'cat_des.nombre as des', 'descripcion', 'ingreso')->join('cat_des', 'cat_des.id', 'oficios.dep_ua')->join('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')->join('cat_areas', 'cat_areas.id', 'oficios.area')->where('oficios.id', $ofi->id)->first();
			$descriponI = "<ul><li><strong>Ingreso de la solicitud</strong>: " . $datosOfi->ingreso . "</li><li><strong>Dependencia o Unidad Académica</strong>: " . $datosOfi->des . "</li><li><strong>Área responsable</strong>: " . $datosOfi->area . "</li><li><strong>Proceso al que impacta</strong>: " . $datosOfi->proceso . "</li></ul>";

			if (!isset($request->id)) {
				$usuario = User::where('rol', 3)->where('id_area', $request->area)->first();
				iBitacoraOficio($ofi->id, "Recepción de oficio: $folio", $descriponI, "fa fa-file-o", "success");

				if (!empty($usuario)) {
					Mail::to($usuario->email)->later(now()->addSeconds(2), new Nuevo($usuario->name, $folio, $evidencia));
				}
			} else {
				iBitacoraOficio($ofi->id, "Edición oficio: $folio", $descriponI, "fe fe-edit", "warning");
			}
		}

		return redirect()->route('oficios.modificaOficio', ['id' => $ofi->id])->with('status', "Oficio guardado correctamente");

		//return back()->with('status', "Oficio guardado correctamente");
	}

	public function uploadFiles(Request $request, $id)
	{
		if (!$request->expectsJson()) {
			$request->headers->set('Accept', 'application/json');
		}

		$request->validate([
			'file' => 'required|file|max:25600|mimes:pdf,doc,docx,jpg,png,xlsx,xls,csv,txt, pptx,xml,zip,rar',
		]);

		if ($request->hasFile('file')) {
			$file = $request->file('file');

			$archivo = 'adjuntos_oficios/' . time() . "_" . \Auth::user()->id . "_" . $request->file->getClientOriginalName();
			$path = \Storage::disk('files')->put($archivo, \File::get($request->file));

			$archivoOficio = new ArchivoOficio();
			$archivoOficio->id_oficio_inicial = $id;
			$archivoOficio->archivo = $archivo;
			$archivoOficio->nombre = $request->file->getClientOriginalName();
			$archivoOficio->save();

			return response()->json([
				'id' => $archivoOficio->id,
				'path' => $path,
				'url' => \Storage::url($path),
			]);
		}

		return response()->json(['error' => 'No se subió ningún archivo'], 400);
	}
 */

	public function save(Request $request)
	{
		if (isset($request->id)) {
			$ofi = Oficio::find($request->id);
			$regla = 'nullable';
			$evidencia = $ofi->archivo;
		} else {
			$ofi = new Oficio();
			$regla = 'required';
			$evidencia = null;
		}

		$request->validate([
			'ingreso'           => 'required',
			'num_oficio'        => 'required_if:ingreso,Físico',
			'num_folio'         => 'required_if:ingreso,Email',
			'dep_ua'            => 'required',
			'area'              => 'required',
			'proceso_impacta'   => ($request->area == 1 ? 'nullable' : 'required'),
			// ojo: quité el espacio antes de pptx
			'archivo'           => $regla . '|mimes:pdf|max:4096',
			'descripcion'       => 'required|min:2|max:1000',
		]);

		if ($request->file('archivo')) {
			// borra anterior si existía
			if (!empty($ofi->archivo)) {
				Storage::disk('files')->delete($ofi->archivo);
			}

			// —— nombre limpio, sin acentos/comas y con colisión controlada ——
			$file = $request->file('archivo');
			$ext  = strtolower($file->getClientOriginalExtension());
			$orig = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

			$base = time() . '_' . (auth()->id() ?? 0) . '_' . $orig;   // patrón que ya usabas
			$base = FS::cleanBase($base);                       // limpia acentos, comas, etc.

			$dir  = 'oficios';
			$path = FS::avoidCollision('files', $dir . '/' . $base . '.' . $ext);

			// guarda usando el nombre final
			Storage::disk('files')->putFileAs($dir, $file, basename($path));

			// guarda ruta relativa limpia en BD
			$evidencia = $path;
		}

		$ofi->ingreso           = $request->ingreso;
		$ofi->num_oficio        = $request->num_oficio;
		$ofi->num_folio         = $request->num_folio;
		$ofi->dep_ua            = $request->dep_ua;
		$ofi->area              = $request->area;
		$ofi->proceso_impacta   = $request->proceso_impacta;
		$ofi->descripcion       = $request->descripcion;
		// pasa por el mutator si lo agregaste; si no, igualmente ya va limpio
		$ofi->archivo           = $evidencia;
		$ofi->save();

		$folio = $request->ingreso == 'Email' ? $request->num_folio : $request->num_oficio;

		if ($request->area != "1") {
			$datosOfi = Oficio::select('cat_procesos.nombre as proceso', 'cat_areas.nombre as area', 'cat_des.nombre as des', 'descripcion', 'ingreso')
				->join('cat_des', 'cat_des.id', 'oficios.dep_ua')
				->join('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')
				->join('cat_areas', 'cat_areas.id', 'oficios.area')
				->where('oficios.id', $ofi->id)->first();

			$descriponI = "<ul><li><strong>Ingreso de la solicitud</strong>: {$datosOfi->ingreso}</li><li><strong>Dependencia o Unidad Académica</strong>: {$datosOfi->des}</li><li><strong>Área responsable</strong>: {$datosOfi->area}</li><li><strong>Proceso al que impacta</strong>: {$datosOfi->proceso}</li></ul>";

			if (!isset($request->id)) {
				$usuario = User::where('rol', 3)->where('id_area', $request->area)->first();
				iBitacoraOficio($ofi->id, "Recepción de oficio: $folio", $descriponI, "fa fa-file-o", "success");
				if (!empty($usuario)) {
					Mail::to($usuario->email)->later(now()->addSeconds(2), new Nuevo($usuario->name, $folio, $evidencia));
				}
			} else {
				iBitacoraOficio($ofi->id, "Edición oficio: $folio", $descriponI, "fe fe-edit", "warning");
			}
		}

		return redirect()->route('oficios.modificaOficio', ['id' => $ofi->id])
			->with('status', "Oficio guardado correctamente");
	}

	public function uploadFiles(Request $request, $id)
	{
		if (!$request->expectsJson()) {
			$request->headers->set('Accept', 'application/json');
		}

		$request->validate([
			// quité el espacio antes de pptx
			'file' => 'required|file|max:25600|mimes:pdf,doc,docx,jpg,png,xlsx,xls,csv,txt,pptx,xml,zip,rar',
		]);

		if (!$request->hasFile('file')) {
			return response()->json(['error' => 'No se subió ningún archivo'], 400);
		}

		$file = $request->file('file');

		// —— nombre limpio y seguro ——
		$ext  = strtolower($file->getClientOriginalExtension());
		$orig = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

		$base = time() . '_' . (auth()->id() ?? 0) . '_' . $orig;
		$base = FS::cleanBase($base);

		$dir  = 'adjuntos_oficios';
		$path = FS::avoidCollision('files', $dir . '/' . $base . '.' . $ext);

		Storage::disk('files')->putFileAs($dir, $file, basename($path));

		$archivoOficio = new ArchivoOficio();
		$archivoOficio->id_oficio_inicial = $id;
		$archivoOficio->archivo = $path;                              // ruta limpia
		$archivoOficio->nombre  = FS::cleanBase($orig) . '.' . $ext;      // nombre mostrado limpio
		$archivoOficio->save();

		return response()->json([
			'id'  => $archivoOficio->id,
			'path' => $path,
			'url' => Storage::url($path), // si 'files' es público con storage:link
		]);
	}

	public function deleteFile(Request $request)
	{
		$idArchivo = $request->getContent();

		if (!$idArchivo) {
			return response()->json(['error' => 'Archivo no especificado'], 400);
		}

		$archivo = ArchivoOficio::find($idArchivo);

		if (!$archivo) {
			return response()->json(['error' => 'Archivo no encontrado'], 400);
		}



		if (\Storage::disk('files')->exists($archivo->archivo)) {
			\Storage::disk('files')->delete($archivo->archivo);
			ArchivoOficio::where('id', $archivo->id)->delete();
			return response()->json(['success' => true]);
		}

		return response()->json(['error' => 'Archivo no encontrado'], 404);
	}
}
