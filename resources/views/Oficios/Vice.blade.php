<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Oficio PDF</title>
    <style>
        /* Margenes de página para header/footer fijos */
        @page {
            size: letter;
            margin-top: 4.5cm;
            margin-left: 4.5cm;
            margin-right: 2.5cm;
            margin-bottom: 2.5cm;
        }

        /* Fuentes */
        @font-face {
            font-family: 'SourceSansPro';
            src: url('{{ public_path('fonts/SourceSansPro-Regular.ttf') }}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }

        @font-face {
            font-family: 'SourceSansPro';
            src: url('{{ public_path('fonts/SourceSansPro-Bold.ttf') }}') format('truetype');
            font-weight: 700;
            font-style: normal;
        }

        @font-face {
            font-family: 'SourceSansPro';
            src: url('{{ public_path('fonts/SourceSansPro-Bold.ttf') }}') format('truetype');
            font-weight: bold;
            font-style: normal;
        }

        @font-face {
            font-family: 'SourceSansPro';
            src: url('{{ public_path('fonts/SourceSansPro-Italic.ttf') }}') format('truetype');
            font-weight: normal;
            font-style: italic;
        }

        @font-face {
            font-family: 'SourceSansPro';
            src: url('{{ public_path('fonts/SourceSansPro-BoldItalic.ttf') }}') format('truetype');
            font-weight: 700;
            font-style: italic;
        }

        @font-face {
            font-family: 'SourceSansPro';
            src: url('{{ public_path('fonts/SourceSansPro-BoldItalic.ttf') }}') format('truetype');
            font-weight: bold;
            font-style: italic;
        }

        body {
            font-family: 'SourceSansPro', arial !important;
            font-size: 9pt !important;
            position: relative;
        }

        /* Header fijo (ajusta el top si cambias margin-top de @page) */
        header {
            position: fixed;
            top: -145px;
            left: -30px;
            right: 0;
            width: 100%;
            text-align: center;
        }

        /* Footer fijo (ajusta el bottom si cambias margin-bottom de @page) */
        footer {
            position: fixed;
            bottom: -125px;
            left: 0;
            right: 0;
            height: 100px;
            text-align: center;
            font-size: 12px;
        }

        /* Marca de agua */
        .background {
            position: fixed;
            right: -343px;
            top: 65px;
            width: 670px;
            z-index: -1;
        }

        .content {
            position: relative;
            z-index: 1;
        }

        .pagenum:before {
            content: counter(page);
        }

        p {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 9pt !important;
        }

        /* ------------------------------------------------------------------
           IMPORTANTÍSIMO:
           NO apliques estilos globales a todas las tablas (rompe el footer).
           Limítalos al contenido dinámico del editor y a .tabla si la usas.
           ------------------------------------------------------------------ */

        /* Tablas del contenido dinámico (SunEditor) */
        .contenido-dinamico table,
        .tabla {
            width: 100%;
            max-width: 100%;
            margin: 0;
            line-height: 1;
            border-collapse: collapse;
            table-layout: fixed;
            /* columnas estables */
            border: 1px solid #000;
        }

        .contenido-dinamico thead,
        .tabla thead {
            display: table-header-group;
            text-align: center;
            vertical-align: middle;
        }

        .contenido-dinamico tfoot,
        .tabla tfoot {
            display: table-footer-group;
        }

        .contenido-dinamico tr,
        .tabla tr {
            page-break-inside: avoid;
        }

        .contenido-dinamico th,
        .contenido-dinamico td,
        .tabla th,
        .tabla td {
            box-sizing: border-box;
            word-break: break-word;
            text-align: center;
            vertical-align: middle;
            padding: 3pt !important;
            line-height: 1;
            border: 1px solid #000 !important;
            white-space: normal;
            hyphens: none;
            min-width: 0;
        }

        .contenido-dinamico thead th,
        .tabla thead th {
            background: #f3f4f6;
            font-weight: 600;
        }

        .cell-justify {
            text-align: justify;
        }

        @media print {

            .contenido-dinamico table,
            .tabla {
                page-break-inside: avoid;
                border: 1px solid #000;
            }
        }

        td p,
        th p {
            margin: 0 !important;
            text-indent: 0 !important;
        }

        /* Sello/firma (opcional) */
        .sello-movil {
            position: absolute;
            top: 45px;
            left: 120px;
            width: 19%;
            z-index: 100000;
            pointer-events: none;
        }

        .firma-movil {
            position: absolute;
            top: 53px;
            left: 0px;
            width: 30%;
            z-index: 100000;
            pointer-events: none;
        }

        .dependencia {
            line-height: .9 !important;
            font-family: 'SourceSansPro';
            font-weight: bold;
            word-break: keep-all;
            hyphens: none;
        }

        .generales {
            font-family: 'SourceSansPro';
            line-height: 1.15;
            font-size: 9pt !important;
        }

        .firma {
            font-family: 'SourceSansPro';
            line-height: 1 !important;
            font-size: 9pt !important;
        }

        .copias {
            font-family: 'SourceSansPro';
            font-style: italic;
            line-height: 1 !important;
            font-size: 7pt !important;
        }

        .contenido-dinamico {
            font-family: 'SourceSansPro';
            font-size: 9pt;
            color: black;
            line-height: 1.15;
            font-style: italic;
        }

        .contenido-dinamico * {
            font-family: inherit;
            font-size: inherit;
            color: inherit;
        }

        .contenido-dinamico ul li,
        .contenido-dinamico ol li {
            font-family: 'SourceSansPro';
            text-align: justify;
            font-weight: bold;
        }

        /* === Imágenes dentro del contenido dinámico === */
        .contenido-dinamico .se-component.se-image-container {
            display: block !important;
            margin: 8px 0 !important;
            float: none !important;
            text-align: left !important;
        }

        .contenido-dinamico .se-component.se-image-container.__se__float-center {
            text-align: center !important;
        }

        .contenido-dinamico .se-component.se-image-container.__se__float-right {
            text-align: right !important;
        }

        .contenido-dinamico .se-component.se-image-container figure {
            display: inline-block !important;
            margin: 0 !important;
            float: none !important;
            width: auto !important;
        }

        .contenido-dinamico .se-component.se-image-container img {
            display: inline-block !important;
            max-width: 100% !important;
            height: auto !important;
            float: none !important;
        }

        .contenido-dinamico [style*="text-align:right"] img {
            display: inline-block !important;
        }

        .contenido-dinamico [style*="text-align:center"] img {
            display: inline-block !important;
        }

        .contenido-dinamico [style*="text-align:left"] img {
            display: inline-block !important;
        }

        /* ------- Footer limpio (sin bordes de tabla), con "palito" ------- */
        .footer-wrap {
            width: 100%;
            text-align: center;
            font-size: 10px;
            color: rgb(136, 136, 136);
            padding: 4px 0 !important;
            background: rgba(255, 255, 255, 0.8);
        }

        .footer-table {
            margin: 0 auto;
            width: auto;
            border-collapse: collapse;
        }

        .footer-table td {
            border: 0;
        }



        .footer-left {
            text-align: right;
            width: 100px;
            padding-right: 7px;
            vertical-align: top;
            line-height: .95;
        }

        .footer-right {
            border-left: 2pt solid #122348 !important;
            /* fuerza el palito */
            padding-left: 7px;
            vertical-align: top;
            line-height: .95;
        }
    </style>
</head>

<body>
    {{-- Marca de agua --}}
    @if (!empty($bgDataUri))
        <img src="{{ $bgDataUri }}" class="background" />
    @else
        <img src="{{ 'file://' . str_replace('\\', '/', public_path('img/minerva_gris_670px_64c.png')) }}"
            class="background" />
    @endif

    {{-- Header (logo) --}}
    <header>
        @if (!empty($logoDataUri))
            <img src="{{ $logoDataUri }}" width="100">
        @else
            <img src="{{ 'file://' . str_replace('\\', '/', public_path('img/minver_buap_azul_200px_16c.png')) }}"
                width="100">
        @endif
    </header>

    {{-- Footer estilizado --}}
    <footer>
        <div class="footer-wrap">
            <table class="footer-table">
                <tr>
                    <td class="footer-left">
                        Universidad<br>para Adultos
                    </td>
                    <td class="footer-right">
                        11 sur 4701. Col. Reforma Agua Azul<br>
                        C.P. 72430 Puebla, Pue.<br>
                        Teléfono: 229 5500, Ext. 1653 y 1602
                    </td>
                </tr>
            </table>
        </div>
    </footer>

    <div class="content">
        <div>
            <p style="font-family: 'SourceSansPro'; font-style: italic;">
                Oficio No. {{ $oficio?->siglas }}/{{ $respuesta?->oficio_respuesta }}/{{ date('Y') }}
            </p>
        </div>

        <br>

        <div style="max-width: 70%;">
            @switch($tipo_usuario)
                @case(1)
                    @php
                        function norm_txt($txt)
                        {
                            $t = strip_tags((string) $txt);
                            $t = str_replace("\xC2\xA0", ' ', $t);
                            $t = str_replace('&nbsp;', ' ', $t);
                            $t = preg_replace('/\s+/u', ' ', $t);
                            return trim($t);
                        }
                        function nb_pairs($t)
                        {
                            $t = preg_replace('/\bde\s+la\b/iu', 'de&nbsp;la', $t);
                            $t = preg_replace('/\bde\s+los\b/iu', 'de&nbsp;los', $t);
                            $t = preg_replace('/\bde\s+las\b/iu', 'de&nbsp;las', $t);
                            $t = preg_replace('/\bdel\b/iu', 'del', $t);
                            return $t;
                        }
                        function cargo_split($c)
                        {
                            $t = norm_txt($c);
                            if (preg_match('/\s*(del|de\s+la|de\s+los|de\s+las|de\s+el|de)\s*$/iu', $t, $m)) {
                                $prep = mb_strtolower(trim($m[1]), 'UTF-8');
                                if ($prep === 'de el') {
                                    $prep = 'del';
                                }
                                $base = trim(preg_replace('/\s*' . preg_quote($m[0], '/') . '$/u', '', $t));
                                return [$base, $prep];
                            }
                            return [trim($t), ''];
                        }
                        function dep_tiene_lider($txt)
                        {
                            $t = mb_strtolower(norm_txt($txt), 'UTF-8');
                            return preg_match('/^(del|de\s+la|de\s+los|de\s+las|de\s+el|el|la|los|las)\b/u', $t) === 1;
                        }
                        function prep_desde_dependencia($txt)
                        {
                            $t = mb_strtolower(norm_txt($txt), 'UTF-8');
                            if (preg_match('/^(del|de\s+la|de\s+los|de\s+las|de\s+el)\b/u', $t, $m)) {
                                $p = $m[1];
                                return $p === 'de el' ? 'del' : $p;
                            }
                            if (preg_match('/^(el)\b/u', $t)) {
                                return 'del';
                            }
                            if (preg_match('/^(la)\b/u', $t)) {
                                return 'de la';
                            }
                            if (preg_match('/^(los)\b/u', $t)) {
                                return 'de los';
                            }
                            if (preg_match('/^(las)\b/u', $t)) {
                                return 'de las';
                            }
                            return 'de la';
                        }
                        function dep_nucleo($txt)
                        {
                            $t = norm_txt($txt);
                            $t = preg_replace('/^(?:del|de\s+la|de\s+los|de\s+las|de\s+el|de)\s+/iu', '', $t);
                            $t = preg_replace('/^(?:el|la|los|las)\s+/iu', '', $t);
                            return trim($t);
                        }
                        function es_cargo_corto($c)
                        {
                            $b = mb_strtolower(norm_txt($c), 'UTF-8');
                            return preg_match('/^director(a)?$/u', $b) === 1;
                        }

                        $nombre = norm_txt($respuesta->nombre ?? '');
                        $cargo_raw = norm_txt($respuesta->cargo ?? '');
                        $dependencia = norm_txt($respuesta->dependencia ?? '');
                        $BUAP = 'Benemérita Universidad Autónoma de Puebla';

                        [$cargoBase, $prepCargo] = cargo_split($cargo_raw);
                        $depTiene = dep_tiene_lider($dependencia);
                        $prepDep = $depTiene ? prep_desde_dependencia($dependencia) : ($prepCargo ?: 'de la');
                        $nucleo = dep_nucleo($dependencia);
                    @endphp

                    @if ($nombre !== '')
                        <p class="dependencia">{{ $nombre }}</p>
                    @endif

                    @if (preg_match('/^rector(a)?$/iu', $cargoBase))
                        <p class="dependencia">{!! nb_pairs($cargoBase . ' de la ' . $BUAP) !!}</p>
                    @else
                        @if ($cargoBase !== '' && $dependencia !== '' && es_cargo_corto($cargoBase))
                            <p class="dependencia">{!! nb_pairs($cargoBase . ' ' . $prepDep . ' ' . $nucleo . ' de la') !!}</p>
                            <p class="dependencia">{!! nb_pairs($BUAP) !!}</p>
                        @else
                            @if ($cargoBase !== '')
                                <p class="dependencia">{!! nb_pairs($cargoBase . ($dependencia !== '' ? ' ' . $prepDep : ' de la')) !!}</p>
                            @endif
                            @if ($dependencia !== '')
                                <p class="dependencia">{!! nb_pairs($nucleo . ' de la') !!}</p>
                            @endif
                            <p class="dependencia">{!! nb_pairs($BUAP) !!}</p>
                        @endif
                    @endif
                @break

                @case(2)
                    <p class="dependencia">{{ $respuesta?->nombre }}</p>
                    <p class="dependencia">{{ $respuesta?->cargo }}</p>
                    <p class="dependencia">{{ $respuesta?->dependencia }}</p>
                @break

            @endswitch

            <p class="generales" style="font-weight:bold; line-height:1 !important;">PRESENTE</p>
        </div>

        <br><br>

        <!-- Contenido -->
        <div class="contenido-dinamico">
            {!! $contenidoPdf ?? ($respuesta?->respuesta ?? '') !!}
        </div>

        <br>

        <p class="generales" style="font-style: italic; line-height: 1;">
            De antemano agradezco su atención y le reitero la seguridad de mi más distinguida consideración.
        </p>

        <br><br>

        <div style="position: relative; page-break-inside: avoid;">
            <p class="firma">Atentamente</p>
            <p class="firma">“Pensar bien, para vivir mejor”</p>
            <p class="firma">H. Puebla de Zaragoza a {{ $fechaEscrita }}</p>

            <br><br><br><br>

            <p class="firma">Mtro. Ricardo Valderrama Valdez</p>
            <p class="firma">Director de la Universidad para Adultos</p>
            <!-- Descomentart si ya quieren sello y firma --->
            {{--             <img src="{{ public_path('img/sello.png') }}" class="sello-movil" />
            <img src="{{ public_path('img/firma.png') }}" class="firma-movil" /> --}}
        </div>

        <div style="margin-top: 20px;">
            @foreach ($copias as $value)
                <p class="copias">
                    C.c.p. {{ $value->nombre }}
                    @if ($value->cargo)
                        , {{ $value->cargo }}
                    @endif
                    @if ($value->dependencia)
                        {{ str_replace([' de la', ' de el', ' de los', ' de las', ' de'], '', $value->dependencia) }}
                    @endif
                    , p.s.c.
                </p>
            @endforeach
            <p class="copias">C.c.p. Archivo</p>
            <p class="copias">
                Dr. RVV/{{ $oficio?->area }}@if ($oficio?->proceso)
                    /{{ $oficio?->proceso }}
                @endif
            </p>
        </div>
    </div>
</body>

</html>
