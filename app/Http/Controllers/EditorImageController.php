<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class EditorImageController extends Controller
{
    public function store(Request $request, int $id)
    {
        try {
            /** @var \Illuminate\Http\UploadedFile|null $file */
            $file = null;
            $allFiles = $request->allFiles();
            array_walk_recursive($allFiles, function ($v) use (&$file) {
                if (!$file && $v instanceof \Illuminate\Http\UploadedFile) $file = $v;
            });
            if (!$file) {
                return response()->json(['errorMessage' => 'No se recibió archivo de imagen.'], 422);
            }

            if (!in_array($file->getMimeType(), ['image/png', 'image/jpeg', 'image/gif', 'image/webp'])) {
                return response()->json(['errorMessage' => 'Formato no permitido. Usa PNG, JPG, GIF o WEBP.'], 422);
            }
            if ($file->getSize() > 2 * 1024 * 1024) {
                return response()->json(['errorMessage' => 'La imagen excede 2MB.'], 413);
            }

            $dir  = "oficios/{$id}/inline-images";
            $ext  = strtolower($file->getClientOriginalExtension() ?: match ($file->getMimeType()) {
                'image/png' => 'png',
                'image/jpeg' => 'jpg',
                'image/gif' => 'gif',
                'image/webp' => 'webp',
                default => 'img',
            });
            $name = \Illuminate\Support\Str::uuid() . '.' . $ext;

            $path = $file->storeAs($dir, $name, 'public');         // guarda en storage/app/public/...
            if (!\Storage::disk('public')->exists($path)) {
                return response()->json(['errorMessage' => 'El archivo no se pudo guardar.'], 500);
            }

            $url = asset('storage/' . ltrim($path, '/'));  // usa la base correcta (APP_URL + prefijo)

            \Log::info('SunEditor upload', compact('path', 'url'));

            return response()->json([
                'result' => [[
                    'url'  => $url,
                    'name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                ]],
                'errorMessage' => null,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['errorMessage' => 'Error al subir imagen: ' . $e->getMessage()], 500);
        }
    }
}
