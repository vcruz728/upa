<?php

namespace App\Console\Commands;

use App\Models\Oficios\ArchivoOficio;
use App\Support\FilenameSanitizer as FS;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class NormalizeStoredFiles extends Command
{
    protected $signature = 'files:normalize
                            {dir=adjuntos_oficios : Carpeta base dentro del disk `files` (ej. adjuntos_oficios, recibido_oficios)}
                            {--dry-run : Solo muestra cambios sin escribir}';

    protected $description = 'Normaliza nombres de archivos (acentos, espacios, símbolos), mueve en storage y actualiza BD.';

    public function handle(): int
    {
        $dir    = trim($this->argument('dir'), '/');
        $dry    = (bool)$this->option('dry-run');
        $disk   = 'files';

        $this->info("DIR: {$dir}");
        $this->info("Dry-run: " . ($dry ? 'SI' : 'NO'));
        $this->line('');

        $q = ArchivoOficio::query()
            ->where('archivo', 'like', $dir . '/%');

        $total = $q->count();
        $this->info("Total candidatos: {$total}");

        $renamed   = 0;
        $onlyName  = 0;
        $notFound  = 0;
        $unchanged = 0;

        $q->orderBy('id')->chunk(200, function ($chunk) use ($disk, $dir, $dry, &$renamed, &$onlyName, &$notFound, &$unchanged) {
            foreach ($chunk as $a) {
                $fromDb = (string)$a->archivo;
                $fromDb = FS::cleanPath($fromDb);

                // Solo procesa los que estén bajo {dir}/
                if (strpos($fromDb, $dir . '/') !== 0) {
                    $unchanged++;
                    continue;
                }

                $this->line('');
                $this->line("ID {$a->id}:");

                $exists = Storage::disk($disk)->exists($fromDb);

                if (!$exists) {
                    // No encontrado: cuenta y sigue
                    $this->warn("  ⚠️ No encontrado en disco: {$fromDb}");
                    $notFound++;
                    continue;
                }

                // Construye destino normalizado a partir del basename actual
                $basename = basename($fromDb);
                $nameBase = pathinfo($basename, PATHINFO_FILENAME);
                $ext      = FS::normalizeExtension(pathinfo($basename, PATHINFO_EXTENSION));
                $nameBase = FS::cleanBase($nameBase);

                $destRel  = $dir . '/' . $nameBase . ($ext ? '.' . $ext : '');
                $destRel  = FS::cleanPath($destRel);

                // Si ya coincide, solo intenta normalizar también el campo "nombre"
                if ($destRel === $fromDb) {
                    $unchanged++;
                    // Aun así, normaliza el display name en BD si viene sucio
                    $wantedName = FS::cleanBase(pathinfo($a->nombre ?: $basename, PATHINFO_FILENAME)) . ($ext ? '.' . $ext : '');
                    if ($a->nombre !== $wantedName) {
                        $this->line("  Nombre BD -> {$a->nombre} => {$wantedName}");
                        if (!$dry) {
                            $a->nombre = $wantedName;
                            $a->save();
                        } else {
                            $onlyName++;
                        }
                    }
                    continue;
                }

                $this->line("  from: {$fromDb}");
                $this->line("    to: {$destRel}");

                if ($dry) {
                    $renamed++;
                    continue;
                }

                // Crear carpeta destino por si no existe
                $destDir = dirname($destRel);
                if (!Storage::disk($disk)->exists($destDir)) {
                    Storage::disk($disk)->makeDirectory($destDir, 0775, true);
                }

                // Paths absolutos para rename/copy fiables
                $srcPath = Storage::disk($disk)->path($fromDb);
                $dstPath = Storage::disk($disk)->path($destRel);

                @mkdir(dirname($dstPath), 0775, true);

                $moved = @rename($srcPath, $dstPath);
                if (!$moved) {
                    $this->warn("   ⚠️ rename() falló; intento copy+delete…");
                    try {
                        $in  = @fopen($srcPath, 'rb');
                        if ($in === false) {
                            throw new \RuntimeException("No se pudo abrir origen para lectura");
                        }
                        $out = @fopen($dstPath, 'wb');
                        if ($out === false) {
                            if (is_resource($in)) fclose($in);
                            throw new \RuntimeException("No se pudo abrir destino para escritura");
                        }

                        if (stream_copy_to_stream($in, $out) === false) {
                            throw new \RuntimeException("Fallo en stream_copy_to_stream");
                        }
                        fclose($in);
                        fclose($out);

                        if (!@unlink($srcPath)) {
                            $this->warn("   ⚠️ Copiado, pero no se pudo borrar el origen (revisa permisos)");
                        }

                        $moved = true;
                    } catch (\Throwable $ex) {
                        $last = error_get_last();
                        $this->error("   ❌ Falló copy+delete: " . $ex->getMessage());
                        if ($last && isset($last['message'])) {
                            $this->error("   ❌ PHP last error: " . $last['message']);
                        }
                        $moved = false;
                    }
                }

                if (!$moved) {
                    $last = error_get_last();
                    if ($last && isset($last['message'])) {
                        $this->error("   ❌ rename() last error: " . $last['message']);
                    }
                    continue; // no tocamos BD
                }

                // Actualiza BD
                $a->archivo = $destRel;
                $a->nombre  = FS::cleanBase(pathinfo($a->nombre ?: $basename, PATHINFO_FILENAME)) . ($ext ? '.' . $ext : '');
                $a->save();

                $renamed++;
            }
        });

        $this->line('');
        $this->info("Total procesados: {$total}");
        $this->info("Renombrados:      {$renamed}");
        $this->info("Solo BD (nombre): {$onlyName}");
        $this->info("No encontrados:   {$notFound}");
        $this->info("Sin cambios:      {$unchanged}");

        return Command::SUCCESS;
    }
}
