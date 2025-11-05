<?php

namespace App\Helpers;

use Illuminate\Support\Str;

class PdfHtml
{
    public static function pdfifySunEditorHtml(?string $html): string
    {
        $html = (string) $html;
        if ($html === '') return '';

        $dom = new \DOMDocument('1.0', 'UTF-8');
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);

        foreach ($dom->getElementsByTagName('img') as $img) {
            /** @var \DOMElement $img */
            $src = $img->getAttribute('src') ?? '';
            if ($src && !Str::startsWith($src, 'data:image')) {
                $path = parse_url($src, PHP_URL_PATH) ?? $src;
                if ($path && (Str::startsWith($path, '/files/') || Str::startsWith($path, 'files/'))) {
                    $relative = ltrim($path, '/'); // files/oficios/...
                    $storage  = storage_path('app/' . $relative);  // storage/app/files/...
                    $public   = public_path($relative);            // public/files/...
                    $file     = is_file($storage) ? $storage : (is_file($public) ? realpath($public) : null);
                    if ($file) {
                        $img->setAttribute('src', $file);          // Dompdf lee archivo local
                    }
                }
            }

            // Si width/height vienen vacíos, intenta origin-size="W,H"
            $wAttr = trim((string) $img->getAttribute('width'));
            $hAttr = trim((string) $img->getAttribute('height'));
            if ($wAttr === '' && $hAttr === '') {
                $origin = (string) $img->getAttribute('origin-size');
                if (preg_match('/^\s*(\d+)\s*,\s*(\d+)\s*$/', $origin, $m)) {
                    $w = (int) $m[1];
                    if ($w > 0) {
                        $img->setAttribute('width', (string) $w);   // px por defecto
                        // dejamos height vacío para mantener aspect ratio + height:auto en CSS
                    }
                }
            }

            // Detectar alineación desde ancestros/clases/estilos
            $align = self::detectImageAlign($img); // 'left'|'center'|'right'|null

            // Normaliza estilo: elimina márgenes conflictivos y asegura display:block
            $style = (string) $img->getAttribute('style');
            $style = preg_replace('/\bmargin-(left|right)\s*:\s*[^;]+;?/i', '', $style ?? '');
            if (!preg_match('/\bdisplay\s*:\s*block\b/i', $style)) {
                $style = rtrim($style, '; ') . ';display:block';
            }

            if ($align === 'center') {
                $style .= ';margin-left:auto;margin-right:auto';
            } elseif ($align === 'right') {
                $style .= ';margin-left:auto;margin-right:0';
            } elseif ($align === 'left') {
                $style .= ';margin-left:0;margin-right:auto';
            }

            $style = trim(preg_replace('/;+/', ';', $style), '; ');
            $img->setAttribute('style', $style);
        }

        $body = $dom->getElementsByTagName('body')->item(0);
        $out = '';
        if ($body) {
            foreach ($body->childNodes as $n) {
                $out .= $dom->saveHTML($n);
            }
        }

        libxml_clear_errors();
        return $out ?: $html;
    }

    private static function detectImageAlign(\DOMElement $img): ?string
    {
        $node = $img;
        $depth = 0;
        while ($node instanceof \DOMElement && $depth < 5) {
            $cls = strtolower((string) $node->getAttribute('class'));
            if ($cls !== '') {
                if (str_contains($cls, '__se__float-right')) return 'right';
                if (str_contains($cls, '__se__float-center')) return 'center';
                if (str_contains($cls, '__se__float-left'))  return 'left';
            }
            $data = strtolower((string) $node->getAttribute('data-align'));
            if (in_array($data, ['left', 'center', 'right'], true)) return $data;

            $sty = strtolower((string) $node->getAttribute('style'));
            if ($sty !== '') {
                if (preg_match('/text-align\s*:\s*right/', $sty))  return 'right';
                if (preg_match('/text-align\s*:\s*center/', $sty)) return 'center';
                if (preg_match('/text-align\s*:\s*left/', $sty))   return 'left';
                if (preg_match('/float\s*:\s*right/', $sty))       return 'right';
                if (preg_match('/float\s*:\s*left/',  $sty))       return 'left';
            }

            $node = $node->parentNode instanceof \DOMElement ? $node->parentNode : null;
            $depth++;
        }
        return null;
    }



    public static function absolutizePublicStorage(string $html): string
    {
        $base = rtrim(public_path(), '/');

        // src="/storage/..."; src='http(s)://host/storage/...'
        $html = preg_replace_callback(
            '#\b(src|data-original)\s*=\s*(["\'])(?:https?://[^"\']+)?/storage/([^"\']+)\2#i',
            function ($m) use ($base) {
                return $m[1] . '=' . $m[2] . $base . '/storage/' . $m[3] . $m[2];
            },
            $html
        );

        // url(/storage/...) o url("http(s)://host/storage/...")
        $html = preg_replace_callback(
            '#url\((["\']?)(?:https?://[^)\'"]+)?/storage/([^)\'"]+)\1\)#i',
            function ($m) use ($base) {
                return 'url("' . $base . '/storage/' . $m[2] . '")';
            },
            $html
        );

        return $html;
    }
}
