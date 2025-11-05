<?php

namespace App\Http\Controllers\Catalogos;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Catalogos\DestinatarioExterno;
use Illuminate\Validation\Rule;

class CatalogosController extends Controller
{
    public function indexExternos()
    {
        $destinatarios = DestinatarioExterno::forCurrentArea()
            ->withTrashed()
            ->orderBy('nombre')
            ->get();

        return Inertia::render('Catalogos/DestinatariosExternos', [
            'destinatarios' => $destinatarios,
        ]);
    }

    public function saveDestinatario(Request $request)
    {
        $areaId = auth()->user()->id_area;

        $request->validate([
            'id'          => ['nullable', 'integer'],
            'nombre'      => ['required', 'string', 'min:2', 'max:255'],
            'cargo'       => ['nullable', 'string', 'max:255'],
            'dependencia' => ['nullable', 'string', 'max:255'],
            // ✅ email único por área (ignora el propio id en actualización)
            'email'       => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('cat_destinatarios_externos', 'email')
                    ->where(fn($q) => $q->where('id_area', $areaId))
                    ->ignore($request->id),
            ],
        ]);

        if ((int)($request->id ?? 0) === 0) {
            $destinatario = new DestinatarioExterno();
            // Si no usas el booted(), asegúrate de setearlo aquí:
            $destinatario->id_area = $areaId;
        } else {
            // ✅ Asegura que el registro pertenezca al área del usuario
            $destinatario = DestinatarioExterno::forCurrentArea($areaId)
                ->withTrashed() // por si editas uno soft-deleted
                ->findOrFail($request->id);
        }

        $destinatario->nombre      = $request->nombre;
        $destinatario->cargo       = $request->cargo;
        $destinatario->dependencia = $request->dependencia;
        $destinatario->email       = $request->email;
        $destinatario->save();

        return redirect()
            ->route('catalogos.destinatariosExternos')
            ->with('success', 'Destinatario externo guardado exitosamente.');
    }

    public function deleteDestinatario($id)
    {
        // ✅ Solo elimina si es de mi área
        $destinatario = DestinatarioExterno::forCurrentArea()->findOrFail($id);
        $destinatario->delete();

        return redirect()
            ->route('catalogos.destinatariosExternos')
            ->with('success', 'Destinatario externo eliminado exitosamente.');
    }

    public function reactivateDestinatario($id)
    {
        // ✅ Solo restaura si es de mi área
        $destinatario = DestinatarioExterno::withTrashed()
            ->forCurrentArea()
            ->findOrFail($id);

        $destinatario->restore();

        return redirect()
            ->route('catalogos.destinatariosExternos')
            ->with('success', 'Destinatario externo reactivado exitosamente.');
    }
}
