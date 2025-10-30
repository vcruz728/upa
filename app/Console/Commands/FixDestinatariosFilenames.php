<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FixDestinatariosFilenames extends Command
{
    protected $signature = 'fix:destinatarios-filenames 
        {--dry-run : Simula sin mover ni actualizar BD}
        {--disk=files : Disk de Storage a usar}
        {--dir=recibido_oficios : Directorio base dentro del disk}
        {--try-recover : Intentar recuperar por parecido cuando la ruta no existe}
        {--force-rename : Forzar renombrado aun si no se detectan caracteres raros}
        {--report : Generar CSVs de cambios y faltantes en storage/app/reports}';

    protected $description = 'Normaliza nombres de archivo en destinatarios_oficio.archivo_respuesta: sin acentos, sin comas; renombra en disco y actualiza BD.';

    public function handle()
    {
        $disk        = $this->option('disk');
        $baseDir     = trim($this->option('dir'), '/');
        $dry         = (bool) $this->option('dry-run');
        $tryRecover  = (bool) $this->option('try-recover');
        $forceRename = (bool) $this->option('force-rename');
        $report      = (bool) $this->option('report');

        $this->info("Buscando candidatos..." . ($dry ? " (dry-run)" : ""));

        $changed = [];
        $missing = [];
        $checked = 0;

        // Index para recuperación por parecido
        $dirIndex = [];
        if ($tryRecover) {
            $this->line("Indexando archivos en '{$baseDir}' del disk '{$disk}'...");
            $all = Storage::disk($disk)->files($baseDir);
            foreach ($all as $p) {
                $b   = pathinfo($p, PATHINFO_FILENAME);
                $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION) ?: '');
                $key = self::normKey($b . '.' . $ext);
                // si hay colisión, preferimos el primero; no pasa nada
                $dirIndex[$key] = $p;
            }
            $this->line("Indexados: " . count($dirIndex));
        }

        DB::table('destinatarios_oficio')
            ->whereNotNull('archivo_respuesta')
            ->where('archivo_respuesta', '!=', '')
            ->orderBy('id')
            ->chunkById(500, function ($rows) use (&$changed, &$missing, &$checked, $disk, $baseDir, $dry, $tryRecover, $dirIndex, $forceRename) {

                foreach ($rows as $r) {
                    $checked++;

                    $oldPath = trim(str_replace('\\', '/', $r->archivo_respuesta));
                    $oldPath = ltrim($oldPath, '/');

                    $ext      = strtolower(pathinfo($oldPath, PATHINFO_EXTENSION) ?: 'pdf');
                    $basename = pathinfo($oldPath, PATHINFO_FILENAME);

                    // ¿Hay algo “raro”? (o forzamos renombrado)
                    $hasNonAscii    = (bool) preg_match('/[^\x20-\x7E]/u', $oldPath);
                    $hasDoubleSpace = Str::contains($oldPath, '  ');
                    $hasAcute       = Str::contains($oldPath, '´'); // U+00B4 común en tus datos
                    $hasComma       = Str::contains($oldPath, ',');
                    $shouldProcess  = $forceRename || $hasNonAscii || $hasDoubleSpace || $hasAcute || $hasComma;

                    if (!$shouldProcess) {
                        continue;
                    }

                    // ¿Existe la ruta actual?
                    $existsOld = Storage::disk($disk)->exists($oldPath);

                    // Si no existe, intentar recuperar por parecido
                    if (!$existsOld) {
                        if ($tryRecover) {
                            $guessBase = self::cleanBaseName($basename);
                            $guessKey  = self::normKey($guessBase . '.' . $ext);

                            if (isset($dirIndex[$guessKey]) && Storage::disk($disk)->exists($dirIndex[$guessKey])) {
                                $found = $dirIndex[$guessKey];

                                // Renombrar también el encontrado a versión limpia (por si trae acentos/comas)
                                $foundBase = pathinfo($found, PATHINFO_FILENAME);
                                $foundExt  = strtolower(pathinfo($found, PATHINFO_EXTENSION) ?: $ext);
                                $cleanFromFound = self::cleanBaseName($foundBase);
                                $targetPath = $baseDir . '/' . $cleanFromFound . '.' . $foundExt;
                                $targetPath = self::avoidCollision($disk, $targetPath);

                                if ($targetPath !== $found) {
                                    $this->line("ID {$r->id}: recuperado y renombrado -> {$targetPath}");
                                    if (!$dry) {
                                        $moved = Storage::disk($disk)->move($found, $targetPath);
                                        if (!$moved) {
                                            $this->error("ID {$r->id}: fallo al mover de {$found} a {$targetPath}");
                                            DB::table('destinatarios_oficio')->where('id', $r->id)
                                                ->update(['archivo_respuesta' => $found]); // fallback
                                            continue;
                                        }
                                        DB::table('destinatarios_oficio')->where('id', $r->id)
                                            ->update(['archivo_respuesta' => $targetPath]);
                                    }
                                    $changed[] = ["id" => $r->id, "from" => $oldPath, "to" => $targetPath, "op" => "recover+rename"];
                                } else {
                                    $this->line("ID {$r->id}: recuperado -> {$found}");
                                    if (!$dry) {
                                        DB::table('destinatarios_oficio')->where('id', $r->id)
                                            ->update(['archivo_respuesta' => $found]);
                                    }
                                    $changed[] = ["id" => $r->id, "from" => $oldPath, "to" => $found, "op" => "recover"];
                                }
                                continue;
                            }
                        }

                        // No se pudo recuperar
                        $this->warn("ID {$r->id}: NO existe en disco -> {$oldPath}");
                        $missing[] = ["id" => $r->id, "path" => $oldPath];
                        continue;
                    }

                    // Existe: renombrar a limpio
                    $cleanBase = self::cleanBaseName($basename);
                    $newPath   = $baseDir . '/' . $cleanBase . '.' . $ext;
                    $newPath   = self::avoidCollision($disk, $newPath);

                    if ($newPath === $oldPath) {
                        // Ya está limpio
                        $this->line("ID {$r->id}: ya normalizado -> {$oldPath}");
                        continue;
                    }

                    $this->line("ID {$r->id}: {$oldPath}  =>  {$newPath}");
                    if (!$dry) {
                        $moved = Storage::disk($disk)->move($oldPath, $newPath);
                        if (!$moved) {
                            $this->error("ID {$r->id}: fallo al mover en disco");
                            continue;
                        }
                        DB::table('destinatarios_oficio')->where('id', $r->id)
                            ->update(['archivo_respuesta' => $newPath]);
                    }
                    $changed[] = ["id" => $r->id, "from" => $oldPath, "to" => $newPath, "op" => "rename"];
                }
            });

        // Reportes
        if ($report) {
            $ts         = date('Ymd_His');
            $dirReport  = 'reports';
            $missingFile = $dirReport . "/destinatarios_missing_{$ts}.csv";
            $changedFile = $dirReport . "/destinatarios_changed_{$ts}.csv";

            $this->writeCsv($missingFile, ['id', 'path'], $missing);
            $this->writeCsv($changedFile, ['id', 'from', 'to', 'op'], $changed);

            $this->info("Reportes:");
            $this->line(" - missing: storage/app/{$missingFile}");
            $this->line(" - changed: storage/app/{$changedFile}");
        }

        $this->info("Revisados: {$checked}. Renombrados/recuperados: " . count($changed) . ($dry ? " (simulados)" : ""));
        return Command::SUCCESS;
    }

    /** Normaliza nombre base: sin acentos, sin comas/; y solo A-Za-z0-9._- */
    public static function cleanBaseName(string $base): string
    {
        $ascii = Str::ascii($base);                   // sin acentos
        $ascii = str_replace([',', ';'], '_', $ascii); // sin comas/;
        $ascii = preg_replace('/[[:cntrl:]]+/', '', $ascii);
        $ascii = trim($ascii);
        $ascii = preg_replace('/\s+/', '_', $ascii);
        $ascii = preg_replace('/[^A-Za-z0-9._-]/', '_', $ascii);
        $ascii = preg_replace('/[_-]{2,}/', '_', $ascii);
        $ascii = preg_replace('/\.{2,}/', '.', $ascii);
        $ascii = mb_substr($ascii, 0, 180);
        return rtrim($ascii, '._-') ?: 'archivo';
    }

    /** Clave para matching difuso simple: ascii+lower+solo alfanumérico */
    public static function normKey(string $name): string
    {
        $name = Str::ascii($name);
        $name = strtolower($name);
        $name = preg_replace('/[^a-z0-9]+/', '', $name);
        return $name;
    }

    /** Evita colisiones agregando sufijo incremental */
    public static function avoidCollision(string $disk, string $path): string
    {
        $dir = pathinfo($path, PATHINFO_DIRNAME);
        $name = pathinfo($path, PATHINFO_FILENAME);
        $ext = pathinfo($path, PATHINFO_EXTENSION);
        $candidate = $path;
        $i = 1;

        while (Storage::disk($disk)->exists($candidate)) {
            $candidate = $dir . '/' . $name . '-' . $i . '.' . $ext;
            $i++;
            if ($i > 999) break;
        }
        return $candidate;
    }

    /** Escribe CSV en storage/app/... (crea carpeta si no existe) */
    protected function writeCsv(string $path, array $headers, array $rows): void
    {
        $full = storage_path('app/' . $path);
        @mkdir(dirname($full), 0777, true);
        $fp = fopen($full, 'w');
        fputcsv($fp, $headers);
        foreach ($rows as $r) {
            $line = [];
            foreach ($headers as $h) {
                $line[] = $r[$h] ?? '';
            }
            fputcsv($fp, $line);
        }
        fclose($fp);
    }
}
