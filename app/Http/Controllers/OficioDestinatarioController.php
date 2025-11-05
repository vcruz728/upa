<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use App\Models\Variables;



class OficioDestinatarioController extends Controller
{
    // === Guarda UNO y asigna un folio ===

    public function store(Request $request)
    {
        $data = $request->validate([
            'id_oficio' => ['required', 'integer', 'exists:oficios,id'],
            'id'        => ['required', 'integer'],
            'tipo'      => ['required', Rule::in(['1', '2'])],
        ]);

        $pivot = 'destinatarios_oficio';

        // Evitar duplicados
        $exists = DB::table($pivot)->where([
            'id_oficio'    => $data['id_oficio'],
            'id_usuario'   => $data['id'],
            'tipo_usuario' => (int)$data['tipo'],
        ])->exists();

        if (!$exists) {
            // 🔹 Obtener el último folio
            $ultimo = Variables::where('variable', 'Oficio')->first();
            $folio  = ($ultimo->valor + 1);
            Variables::where('variable', 'Oficio')->update(['valor' => $folio]);

            DB::table($pivot)->insert([
                'id_oficio'    => $data['id_oficio'],
                'id_usuario'   => $data['id'],
                'tipo_usuario' => (int)$data['tipo'],
                'folio'        => $folio,   // 👈 Folio único por destinatario
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
        }

        return $request->expectsJson()
            ? response()->json(['ok' => true])
            : back()->with('status', 'destinatario-guardado');
    }


    public function storeBatch(Request $request)
    {
        $validated = $request->validate([
            'id_oficio' => ['required', 'integer', 'exists:oficios,id'],
            'destinatarios' => ['required', 'array', 'min:1'],
            'destinatarios.*.id'   => ['required', 'integer'],
            'destinatarios.*.tipo' => ['required', Rule::in(['1', '2'])],
        ]);

        $pivot = 'destinatarios_oficio';

        DB::transaction(function () use ($validated, $pivot) {
            foreach ($validated['destinatarios'] as $d) {
                $exists = DB::table($pivot)->where([
                    'id_oficio'    => $validated['id_oficio'],
                    'id_usuario'   => $d['id'],
                    'tipo_usuario' => (int)$d['tipo'],
                ])->exists();

                if (!$exists) {
                    // 🔹 Generar folio único por destinatario
                    $ultimo = Variables::where('variable', 'Oficio')->first();
                    $folio  = ($ultimo->valor + 1);
                    Variables::where('variable', 'Oficio')->update(['valor' => $folio]);

                    DB::table($pivot)->insert([
                        'id_oficio'    => $validated['id_oficio'],
                        'id_usuario'   => $d['id'],
                        'tipo_usuario' => (int)$d['tipo'],
                        'folio'        => $folio,   // 👈 aquí va el folio
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]);
                }
            }
        });

        return response()->json(['ok' => true]);
    }

    public function destroy($id)
    {
        DB::table('destinatarios_oficio')->where('id', (int)$id)->delete();
        return back()->with('status', 'destinatario-eliminado');
    }
}
