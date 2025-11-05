<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class FilenameSanitizer
{
    /**
     * Convierte a ASCII, reemplaza separadores por "_",
     * elimina caracteres no permitidos, colapsa múltiples,
     * y recorta guiones/underscores/dots sobrantes.
     */
    public static function cleanBase(string $base): string
    {
        $base = trim($base);

        // 1) a ASCII
        $base = self::toAscii($base);

        // 2) separadores a "_"
        $base = preg_replace('/[^\w\.\-]+/u', '_', $base) ?? $base;

        // 3) colapsa múltiples "_", "." y "-."
        $base = preg_replace('/_+/', '_', $base) ?? $base;
        $base = preg_replace('/\.+/', '.', $base) ?? $base;
        $base = preg_replace('/-+/', '-', $base) ?? $base;

        // 4) quita underscores / guiones / puntos al inicio/fin
        $base = preg_replace('/^[_\.\-]+|[_\.\-]+$/', '', $base) ?? $base;

        // 5) evita nombres vacíos
        if ($base === '' || $base === '.' || $base === '..') {
            $base = 'archivo';
        }

        return $base;
    }

    /**
     * Normaliza la extensión: minúsculas y limpia caracteres raros.
     */
    public static function normalizeExtension(?string $ext): string
    {
        $ext = strtolower((string) $ext);
        $ext = preg_replace('/[^a-z0-9]+/', '', $ext) ?? $ext;
        return $ext;
    }

    /**
     * Limpia rutas relativas (quita dobles slashes, puntos, etc.).
     */
    public static function cleanPath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $path = preg_replace('#/+#', '/', $path) ?? $path;
        $path = preg_replace('#^\./#', '', $path) ?? $path;
        $path = preg_replace('#/\./#', '/', $path) ?? $path;
        $path = preg_replace('#/+$#', '', $path) ?? $path;
        return ltrim($path, '/');
    }

    /**
     * Evita colisiones generando "<base>_2.ext", "<base>_3.ext", etc.
     */
    public static function avoidCollision(string $disk, string $relativePath): string
    {
        $relativePath = self::cleanPath($relativePath);
        if (!Storage::disk($disk)->exists($relativePath)) {
            return $relativePath;
        }

        $dir  = trim(dirname($relativePath), '.');
        $file = basename($relativePath);
        $name = pathinfo($file, PATHINFO_FILENAME);
        $ext  = pathinfo($file, PATHINFO_EXTENSION);

        $i = 2;
        while (true) {
            $candidate = ($dir && $dir !== '/')
                ? $dir . '/' . $name . '_' . $i . ($ext ? '.' . $ext : '')
                : $name . '_' . $i . ($ext ? '.' . $ext : '');

            if (!Storage::disk($disk)->exists($candidate)) {
                return $candidate;
            }
            $i++;
        }
    }

    /**
     * Best-effort ASCII (sin dependencias extensas).
     */
    public static function toAscii(string $str): string
    {
        $str = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $str) ?: $str;
        // iconv puede devolver ?; quítalos
        $str = str_replace('?', '', $str);
        return $str;
    }
}
