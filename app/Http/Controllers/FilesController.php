<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;

class FilesController
{
    public function __invoke(string $path)
    {
        $path = ltrim($path, '/');

        // Evita traversal
        if (str_contains($path, '..')) {
            abort(403);
        }

        if (!Storage::disk('files')->exists($path)) {
            abort(404);
        }

        // Deja que Laravel resuelva mime y cabeceras
        return Storage::disk('files')->response($path); // inline por defecto
    }
    public function inlineImage($id, $name)
    {
        $relative = "oficios/{$id}/inline-images/{$name}";
        abort_unless(\Storage::disk('files')->exists($relative), 404);

        return \Storage::disk('files')->response($relative, null, [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
