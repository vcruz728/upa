<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PdfCache
{
    public static function baseDir(): string
    {
        return config('pdf_cache.dir', 'pdf_cache');
    }

    /** Patrón de nombre de archivo que ya usas: oficio_{id}_{tipo}_{usr}_{sha1}.pdf */
    public static function makePattern(int $id, int $tipo, int $usr): string
    {
        return sprintf('oficio_%d_%d_%d_', $id, $tipo, $usr);
    }

    /** Mantiene sólo las N más recientes para ese (id, tipo, usr). */
    public static function pruneSiblings(int $id, int $tipo, int $usr, ?int $keep = null): int
    {
        $keep = $keep ?? (int) config('pdf_cache.keep_per_oficio', 1);
        $disk = Storage::disk('local');
        $dir  = self::baseDir();
        $prefix = self::makePattern($id, $tipo, $usr);

        // Listar archivos que empatan el prefijo
        $files = collect($disk->files($dir))
            ->filter(fn($p) => Str::startsWith(basename($p), $prefix) && Str::endsWith($p, '.pdf'))
            ->map(function ($p) use ($disk) {
                $abs = $disk->path($p);
                return [
                    'path'  => $p,
                    'mtime' => @filemtime($abs) ?: 0,
                ];
            })
            ->sortByDesc('mtime')
            ->values();

        // Borrar del índice $keep en adelante
        $toDelete = $files->slice($keep);
        foreach ($toDelete as $f) {
            $disk->delete($f['path']);
        }
        return $toDelete->count();
    }

    /** Borra archivos más viejos que X días en pdf_cache + extras configuradas. */
    public static function pruneOlderThan(?int $days = null): int
    {
        $days   = $days ?? (int) config('pdf_cache.max_age_days', 15);
        $cutoff = now()->subDays($days)->getTimestamp();
        $disk   = Storage::disk('local');

        $count = 0;

        // 1) pdf_cache
        $count += self::pruneDirOlderThan(self::baseDir(), $cutoff, $disk);

        // 2) extras
        foreach ((array) config('pdf_cache.extra_dirs', []) as $dir => $dirDays) {
            $dirCutoff = now()->subDays((int) $dirDays)->getTimestamp();
            $count    += self::pruneDirOlderThan($dir, $dirCutoff, $disk);
        }

        return $count;
    }

    protected static function pruneDirOlderThan(string $dir, int $cutoffTs, $disk): int
    {
        if (!$disk->exists($dir)) {
            return 0;
        }
        $deleted = 0;
        foreach ($disk->allFiles($dir) as $p) {
            $abs = $disk->path($p);
            $mtime = @filemtime($abs) ?: 0;
            if ($mtime > 0 && $mtime < $cutoffTs) {
                if ($disk->delete($p)) {
                    $deleted++;
                }
            }
        }
        return $deleted;
    }
}
