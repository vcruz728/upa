<?php

namespace App\Helpers;

use App\Models\Descanso;
use Carbon\Carbon;

class TiempoHabil
{
    /**
     * Suma horas excluyendo fines de semana y días en 'descansos'.
     * @param Carbon $inicio Fecha/hora de inicio
     * @param int    $horas  Horas a sumar (ej. 72)
     * @param bool   $excluirFinesDeSemana  true = no cuentan sábados ni domingos
     */
    public static function sumarHorasExcluyendoDescansos(
        Carbon $inicio,
        int $horas,
        bool $excluirFinesDeSemana = true
    ): Carbon {
        if ($horas <= 0) return $inicio->copy();

        // Rango holgado para precargar descansos (30 días suele sobrar para 72 h)
        $finEstimado = $inicio->copy()->addDays(30);

        $descansos = Descanso::query()
            ->whereBetween('descanso_dia', [$inicio->toDateString(), $finEstimado->toDateString()])
            ->pluck('descanso_dia') // colección de fechas
            ->all();

        // Conjunto para consulta O(1)
        $setDescansos = [];
        foreach ($descansos as $d) {
            $setDescansos[Carbon::parse($d)->toDateString()] = true;
        }

        $actual = $inicio->copy();
        $acumuladas = 0;

        while ($acumuladas < $horas) {
            $esFinDeSemana = $excluirFinesDeSemana && in_array($actual->dayOfWeekIso, [6, 7], true);
            $esDescanso = isset($setDescansos[$actual->toDateString()]);

            if (!$esFinDeSemana && !$esDescanso) {
                // Esta hora sí cuenta
                $acumuladas++;
            }

            // Avanza una hora calendario
            $actual->addHour();

            // Si cruzamos el rango precargado, trae más (poco común, pero seguro)
            if ($actual->greaterThan($finEstimado)) {
                $extra = Descanso::query()
                    ->whereBetween('descanso_dia', [$finEstimado->toDateString(), $actual->copy()->addDays(30)->toDateString()])
                    ->pluck('descanso_dia')
                    ->all();

                foreach ($extra as $d) {
                    $setDescansos[Carbon::parse($d)->toDateString()] = true;
                }
                $finEstimado = $actual->copy()->addDays(30);
            }
        }

        return $actual;
    }
}
