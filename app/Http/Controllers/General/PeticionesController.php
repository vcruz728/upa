<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Catalogos\Procesos;
use App\Models\Catalogos\DestinatarioExterno;
use App\Models\User;
use App\Models\Bitacoras\BitOficios;
use App\Models\Directorio\Directorio;
use DB;

class PeticionesController extends Controller
{
    public function getProcesos($id)
    {
        try {
            $procesos = Procesos::select('id as value', 'nombre as label')->where('id_area', $id)->get();

            $msg = [
                'code' => 200,
                'mensaje' => 'Listado de procesos',
                'data' => $procesos
            ];
        } catch (\Illuminate\DataBase\QueryException $ex) {
            $msg = [
                'code' => 400,
                'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
                'data' => $ex
            ];
        } catch (Exception $e) {
            $msg = [
                'code' => 400,
                'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
                'data' => $e
            ];
        }

        return response()->json($msg, $msg['code']);
    }


    public function getUsersProcesos($id_area, $id_proceso)
    {
        try {
            $usuarios = User::select('id as value', 'name as label')->where('id_area', $id_area)->where('id_proceso', $id_proceso)->get();

            $msg = [
                'code' => 200,
                'mensaje' => 'Listado de usuarios por proceso',
                'data' => $usuarios
            ];
        } catch (\Illuminate\DataBase\QueryException $ex) {
            $msg = [
                'code' => 400,
                'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
                'data' => $ex
            ];
        } catch (Exception $e) {
            $msg = [
                'code' => 400,
                'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
                'data' => $e
            ];
        }

        return response()->json($msg, $msg['code']);
    }

    public function getLineaTiempo($id)
    {
        try {
            $usuarios = BitOficios::select(
                'id',
                'id_oficio',
                'accion',
                'descripcion',
                'icono',
                DB::raw("CONCAT( RIGHT('0'+cast(DAY(created_at) as varchar(2)),2) ,' de ', dbo.fn_GetMonthName (created_at, 'Spanish'),' de ',YEAR(created_at),' ', CONVERT(VARCHAR(5),created_at,108)) as fecha"),
                'color',
            )->where('id_oficio', $id)->orderBy('id')->get();

            $msg = [
                'code' => 200,
                'mensaje' => 'Listado de usuarios por proceso',
                'data' => $usuarios
            ];
        } catch (\Illuminate\DataBase\QueryException $ex) {
            $msg = [
                'code' => 400,
                'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
                'data' => $ex
            ];
        } catch (Exception $e) {
            $msg = [
                'code' => 400,
                'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
                'data' => $e
            ];
        }

        return response()->json($msg, $msg['code']);
    }

    public function getDetalleDirectorio($id, $tipo)
    {
        try {
            if ($tipo == 'Externo') {
                $detalle = DestinatarioExterno::find($id);
            } else {
                $detalle = Directorio::find($id);
            }

            $msg = [
                'code' => 200,
                'mensaje' => 'Detalle del directorio',
                'data' => $detalle
            ];
        } catch (\Illuminate\DataBase\QueryException $ex) {
            $msg = [
                'code' => 400,
                'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
                'data' => $ex
            ];
        } catch (Exception $e) {
            $msg = [
                'code' => 400,
                'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
                'data' => $e
            ];
        }

        return response()->json($msg, $msg['code']);
    }
}
