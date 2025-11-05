<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\Catalogos\DestinatarioExterno;

class DestinatariosApiController extends Controller
{
    /**
     * GET /api/destinatarios
     * Query params:
     *  - tipo: 'interno' | 'externo'
     *  - segmento: 'todos' | 'superior' | 'medio' | 'complejos' | 'institutos' (solo interno)
     *  - q, page, per_page
     * Respuesta: { data: [...], total: N }
     */
    public function index(Request $request)
    {
        $tipo     = strtolower((string) $request->query('tipo', 'interno'));
        $segmento = strtolower((string) $request->query('segmento', 'todos'));
        $q        = trim((string) $request->query('q', ''));
        $page     = max(1, (int) $request->query('page', 1));
        $perPage  = max(1, min(200, (int) $request->query('per_page', 50)));
        $offset   = ($page - 1) * $perPage;

        if ($tipo === 'interno') {
            $base = DB::table('directorios')
                ->select([
                    'id',
                    'cargo',
                    'nombre',
                    'dependencia',
                    'tipo',
                    DB::raw('1 as es_interno'),
                ]);

            // Alias UI -> valor exacto en BD
            $map = [
                'todos'                 => null,
                'medio'                 => 'nivel_medio_superior',
                'nivel_medio_superior'  => 'nivel_medio_superior',
                'superior'              => 'nivel_superior',
                'nivel_superior'        => 'nivel_superior',
                'complejos'             => 'complejos',
                'institutos'            => 'instituto', // en BD singular
                'instituto'             => 'instituto',
            ];

            $needle = $map[$segmento] ?? null;

            if ($needle !== null) {
                $base->whereRaw(
                    "LOWER(LTRIM(RTRIM(ISNULL(tipo,'')))) = ?",
                    [strtolower($needle)]
                );
            }
            // 'todos' => sin filtro

            if ($q !== '') {
                $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%';
                $base->where(function ($w) use ($like) {
                    $w->where('nombre', 'like', $like)
                        ->orWhere('dependencia', 'like', $like)
                        ->orWhere('cargo', 'like', $like);
                });
            }

            $total = (clone $base)->count();
            $rows  = $base->orderBy('dependencia')->orderBy('nombre')
                ->offset($offset)->limit($perPage)->get()
                ->map(fn($r) => [
                    'id'          => (int) $r->id,
                    'cargo'       => (string)($r->cargo ?? ''),
                    'nombre'      => (string)($r->nombre ?? ''),
                    'dependencia' => (string)($r->dependencia ?? ''),
                    'nivel'       => (string)($r->tipo ?? ''), // compat
                    'es_interno'  => 1,
                ]);

            return response()->json(['data' => $rows, 'total' => $total]);
        }

        // === Externos (filtrados por área) ===
        if (!Auth::check() || !Auth::user()->id_area) {
            // Puedes devolver 401 si prefieres: return response()->json([...], 401);
            return response()->json(['data' => [], 'total' => 0]);
        }
        $areaId = (int) Auth::user()->id_area;

        // Con Eloquent + SoftDeletes: por defecto NO incluye borrados
        $base = DestinatarioExterno::query()
            ->forCurrentArea($areaId)
            ->select(['id', 'cargo', 'nombre', 'dependencia']);

        if ($q !== '') {
            $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%';
            $base->where(function ($w) use ($like) {
                $w->where('nombre', 'like', $like)
                    ->orWhere('dependencia', 'like', $like)
                    ->orWhere('cargo', 'like', $like)
                    ->orWhere('email', 'like', $like);
            });
        }

        $total = (clone $base)->count();
        $rows  = $base->orderBy('dependencia')->orderBy('nombre')
            ->offset($offset)->limit($perPage)->get()
            ->map(fn($r) => [
                'id'          => (int) $r->id,
                'cargo'       => (string)($r->cargo ?? ''),
                'nombre'      => (string)($r->nombre ?? ''),
                'dependencia' => (string)($r->dependencia ?? ''),
                'nivel'       => null,
                'es_interno'  => 0,
            ]);

        return response()->json(['data' => $rows, 'total' => $total]);
    }
}
