<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReservacionController;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

if (app()->environment('local')) {
    Route::get('/destinatarios-demo', function (Request $r) {
        // ----- Dataset de ejemplo (mezcla de internos/externos y niveles)
        $fakerows = [];
        $depsSup = ['Facultad de Ciencias de la Computación', 'Facultad de Ingeniería', 'Facultad de Administración'];
        $depsMed = ['Preparatoria Emiliano Zapata', 'Preparatoria Regional “Enrique Cabrera”', 'Bachillerato Internacional “5 de Mayo”'];
        $otros   = ['Dirección de Deporte', 'Difusión Cultural', 'Recursos Materiales'];

        $id = 1;
        foreach ($depsSup as $d) {
            for ($i = 1; $i <= 12; $i++) {
                $fakerows[] = [
                    'id'          => $id++,
                    'cargo'       => 'Director(a) de ' . $d,
                    'nombre'      => "Mtro./Mtra. Nombre Superior $i",
                    'dependencia' => $d,
                    'nivel'       => 'nivel_superior',
                    'es_interno'  => 1,
                ];
            }
        }
        foreach ($depsMed as $d) {
            for ($i = 1; $i <= 12; $i++) {
                $fakerows[] = [
                    'id'          => $id++,
                    'cargo'       => 'Director(a) de ' . $d,
                    'nombre'      => "Mtro./Mtra. Nombre Medio $i",
                    'dependencia' => $d,
                    'nivel'       => 'nivel_medio_superior',
                    'es_interno'  => 1,
                ];
            }
        }
        foreach ($otros as $d) {
            for ($i = 1; $i <= 8; $i++) {
                $fakerows[] = [
                    'id'          => $id++,
                    'cargo'       => 'Titular de ' . $d,
                    'nombre'      => "Ing./Lic. Nombre Otro $i",
                    'dependencia' => $d,
                    'nivel'       => null,
                    'es_interno'  => 1,
                ];
            }
        }
        // Externos
        for ($i = 1; $i <= 15; $i++) {
            $fakerows[] = [
                'id'          => $id++,
                'cargo'       => 'Representante Externo',
                'nombre'      => "Empresa Externa $i",
                'dependencia' => "Dependencia Externa $i",
                'nivel'       => null,
                'es_interno'  => 0,
            ];
        }

        // ----- Parámetros
        $tipo     = $r->input('tipo', 'interno');      // interno|externo
        $segmento = $r->input('segmento', 'todos');    // superior|medio|otros|todos
        $q        = trim((string) $r->input('q', ''));
        $page     = max(1, (int) $r->input('page', 1));
        $perPage  = max(1, min(50, (int) $r->input('per_page', 25)));

        // ----- Filtros
        $rows = array_values(array_filter($fakerows, function ($r) use ($tipo) {
            return $r['es_interno'] === ($tipo === 'interno' ? 1 : 0);
        }));

        if ($tipo === 'interno') {
            if ($segmento === 'superior') {
                $rows = array_values(array_filter($rows, fn($r) => $r['nivel'] === 'nivel_superior'));
            } elseif ($segmento === 'medio') {
                $rows = array_values(array_filter($rows, fn($r) => $r['nivel'] === 'nivel_medio_superior'));
            } elseif ($segmento === 'otros') {
                $rows = array_values(array_filter($rows, fn($r) => !$r['nivel'] || !in_array($r['nivel'], ['nivel_superior', 'nivel_medio_superior'])));
            }
        }

        if ($q !== '') {
            $needle = mb_strtolower($q);
            $rows = array_values(array_filter($rows, function ($r) use ($needle) {
                $hay = mb_strtolower(($r['nombre'] ?? '') . '|' . ($r['dependencia'] ?? ''));
                return str_contains($hay, $needle);
            }));
        }

        // ----- Orden & paginación
        usort($rows, fn($a, $b) => [$a['dependencia'], $a['nombre']] <=> [$b['dependencia'], $b['nombre']]);
        $total   = count($rows);
        $offset  = ($page - 1) * $perPage;
        $paged   = array_slice($rows, $offset, $perPage);

        return response()->json([
            'data'         => array_values($paged),
            'total'        => $total,
            'current_page' => $page,
            'per_page'     => $perPage,
        ]);
    });
}
