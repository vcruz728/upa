<?php

namespace App\Helpers;

use Illuminate\Support\Str;

class pdfifySunEditorHtml
{
    public static function pdfifySunEditorHtml(?string $html): string
    {
        $html = (string) $html;
        if ($html === '') return '';

        $dom = new \DOMDocument('1.0', 'UTF-8');
        libxml_use_internal_errors(true);
        // Prefijo XML para forzar UTF-8 y no romper acentos
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);

        // 1) Reescribir <img src="..."> a RUTA LOCAL si apunta a /files/...
        foreach ($dom->getElementsByTagName('img') as $img) {
            $src = $img->getAttribute('src') ?? '';
            if (!$src) continue;

            // Si es data: deja como está (Dompdf también soporta data URIs)
            if (Str::startsWith($src, 'data:image')) {
                // nada
            } else {
                $path = parse_url($src, PHP_URL_PATH) ?? $src; // cae a src si no hay URL
                if ($path && (Str::startsWith($path, '/files/') || Str::startsWith($path, 'files/'))) {
                    $file = public_path(ltrim($path, '/'));     // public/files/...
                    if (is_file($file)) {
                        $img->setAttribute('src', $file);       // ← Dompdf lee archivo local
                    }
                }
            }

            // 2) Centrado “duro” que Dompdf respeta
            $style = strtolower($img->getAttribute('style') ?? '');
            if (!str_contains($style, 'display:block'))      $style .= ';display:block';
            if (!str_contains($style, 'margin-left:auto'))   $style .= ';margin-left:auto';
            if (!str_contains($style, 'margin-right:auto'))  $style .= ';margin-right:auto';
            $img->setAttribute('style', trim($style, ';'));
        }

        // Devolvemos sólo el contenido del <body>
        $body = $dom->getElementsByTagName('body')->item(0);
        return $body ? $dom->saveHTML($body) : $html;
    }
}
