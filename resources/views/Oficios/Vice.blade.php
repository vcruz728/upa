<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Oficio PDF</title>
    <style>
        @page {
            size: letter;
            margin-top: 4.5cm;
            margin-left: 4.5cm;
            margin-right: 2.5cm;
            margin-bottom: 2.5cm;



        }

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

        header {
            position: fixed;
            top: -145px;
            left: -30px;
            right: 0;
            width: 100%;
            text-align: center;
        }

        footer {
            position: fixed;
            bottom: -125px;
            left: 0;
            right: 0;
            height: 100px;
            text-align: center;
            font-size: 12px;
        }

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


        /* Tablas limpias y estables */
        table {
            width: 100%;
            max-width: 100%;
            margin: 0;
            line-height: 1;
            border-collapse: collapse;
            table-layout: fixed;
            /* columnas estables y sin “bailes” */
            border: 1px solid #000;
        }

        thead {
            display: table-header-group;
            text-align: center;
            vertical-align: middle;
        }

        tfoot {
            display: table-footer-group;
        }

        tr {
            page-break-inside: avoid;
        }


        /* Celdas */
        th,
        td {
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

        /* Encabezado visual */
        thead th {
            background: #f3f4f6;
            font-weight: 600;
        }

        /* Si tienes columnas con mucho texto que quieras justificar */
        .cell-justify {
            text-align: justify;
        }

        /* Consejos para PDF (Dompdf): paddings moderados y evitar partir tablas */
        @media print {
            table {
                page-break-inside: avoid;
                border: 1px solid #000;
            }
        }

        td p,
        th p {
            margin: 0 !important;
            text-indent: 0 !important;
        }


        /* opcional, evita negativos de Word */
        .sello-movil {
            position: absolute;
            top: 45px;
            left: 120px;
            width: 19%;
            z-index: 100000;
            pointer-events: none;
            /* Opcional: para que no bloquee el texto */

        }

        .firma-movil {
            position: absolute;
            top: 53px;
            left: 0px;
            width: 30%;
            z-index: 100000;
            pointer-events: none;
            /* Opcional: para que no bloquee el texto */

        }


        .dependencia {
            line-height: 0.9 !important;
            font-family: 'SourceSansPro';
            font-weight: bold;
            word-break: keep-all;
            /* no partir palabras */
            hyphens: none;
            /* sin guiones automáticos */
        }

        .generales {
            font-family: 'SourceSansPro';
            font-style: normal;
            line-height: 1.15;
            font-size: 9pt !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .firma {
            font-family: 'SourceSansPro';
            font-style: normal;
            line-height: 1 !important;
            font-size: 9pt !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .copias {
            font-family: 'SourceSansPro';
            font-style: italic;
            line-height: 1 !important;
            font-size: 7pt !important;
            margin: 0 !important;
            padding: 0 !important;
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

        /* === Imágenes del contenido dinámico (PDF) === */
        .contenido-dinamico .se-component.se-image-container {
            display: block !important;
            margin: 8px 0 !important;
            float: none !important;

            /* alineación por defecto */
            text-align: left !important;
        }

        /* Respeta lo que puso SunEditor */
        .contenido-dinamico .se-component.se-image-container.__se__float-center {
            text-align: center !important;
        }

        .contenido-dinamico .se-component.se-image-container.__se__float-right {
            text-align: right !important;
        }

        /* El figure no debe romper la alineación del contenedor */
        .contenido-dinamico .se-component.se-image-container figure {
            display: inline-block !important;
            /* para que text-align afecte */
            margin: 0 !important;
            float: none !important;
            width: auto !important;
        }

        /* La imagen en línea para que se alinee con text-align */
        .contenido-dinamico .se-component.se-image-container img {
            display: inline-block !important;
            max-width: 100% !important;
            height: auto !important;
            float: none !important;
        }

        /* Si llega text-align en estilo inline del wrapper, respétalo también */
        .contenido-dinamico [style*="text-align:right"] img {
            display: inline-block !important;
        }

        .contenido-dinamico [style*="text-align:center"] img {
            display: inline-block !important;
        }

        .contenido-dinamico [style*="text-align:left"] img {
            display: inline-block !important;
        }
    </style>
</head>

<body>
    <!-- <img src="{{ public_path('img/minerva_gris.png') }}" class="background" />  descomentar cuando no haya hojas membretadas -->
    <header>
        <!-- <img src="{{ public_path('img/minver_buap_azul.png') }}" width="100" >  descomentar cuando no haya hojas membretadas -->
    </header>
    <footer>
        <div
            style="width: 100%; text-align: center; font-size: 10px; color: rgb(136, 136, 136); padding: 4px 0 !important; background: rgba(255,255,255,0.8); display:none;">
            <!-- display:none; quitar cuando no haya hojas membretadas -->
            <table style="margin: 0 auto;  width: auto;">
                <tr>
                    <td
                        style="text-align: right; width: 90px;  vertical-align: top; padding-right: 0 !important; border: none !important; line-height: 0.8 !important;">
                        Vicerrectoria<br>de Docencia
                    </td>
                    <td style=" vertical-align: middle; text-align: center; border: none !important;">
                        <div
                            style="display: inline-block; width: 1.5px; height: 45px; background: #adcbd3; margin: 0 auto;">
                        </div>
                    </td>
                    <td
                        style="text-align: left;  vertical-align: top; padding-left: 7px !important; border: none !important; line-height: 0.8 !important;">
                        4to. piso de la Torre de Gestión<br>
                        Académica y servicios Administrativos,<br>
                        Ciudad Universitaría, Puebla, Pue.<br>
                        Tel. 222 229 55 00, Ext. 3553 y 5900
                    </td>
                </tr>
            </table>
        </div>
    </footer>
    <div class="content">
        <div>
            <p style="font-family: 'SourceSansPro'; font-style: italic; ">Oficio No.
                {{ $oficio?->siglas }}/{{ $respuesta?->oficio_respuesta }}/{{ date('Y') }}</p>
        </div>
        <br>
        <div style="max-width: 70%;">
            @switch($tipo_usuario)
                @case(1)
                    @php
                        // --- Normalización y helpers ---

                        function norm_txt($txt)
                        {
                            $t = strip_tags((string) $txt);
                            $t = str_replace("\xC2\xA0", ' ', $t); // NBSP UTF-8
                            $t = str_replace('&nbsp;', ' ', $t); // NBSP HTML
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

                        // Divide cargo en (base, preposición final si traía)
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

                        // ¿Dependencia trae líder (prep/artículo) al inicio?
                        function dep_tiene_lider($txt)
                        {
                            $t = mb_strtolower(norm_txt($txt), 'UTF-8');
                            return preg_match('/^(del|de\s+la|de\s+los|de\s+las|de\s+el|el|la|los|las)\b/u', $t) === 1;
                        }

                        // Preposición sugerida por la dependencia (si trae); si no, por artículo; si no, "de la"
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

                        // Núcleo de dependencia (sin prep/artículo iniciales)
                        function dep_nucleo($txt)
                        {
                            $t = norm_txt($txt);
                            $t = preg_replace('/^(?:del|de\s+la|de\s+los|de\s+las|de\s+el|de)\s+/iu', '', $t);
                            $t = preg_replace('/^(?:el|la|los|las)\s+/iu', '', $t);
                            return trim($t);
                        }

                        // Cargos que van en una sola línea con la dependencia
                        function es_cargo_corto($c)
                        {
                            $b = mb_strtolower(norm_txt($c), 'UTF-8');
                            return preg_match('/^director(a)?$/u', $b) === 1;
                            // agrega si quieres: |abogado(a)?\s+general|jefe(a)?|coordinador(a)?
                        }

                        // === Datos normalizados ===
                        $nombre = norm_txt($respuesta->nombre ?? '');
                        $cargo_raw = norm_txt($respuesta->cargo ?? '');
                        $dependencia = norm_txt($respuesta->dependencia ?? '');
                        $BUAP = 'Benemérita Universidad Autónoma de Puebla';

                        // Cargo -> (base, prep del cargo si venía)
                        [$cargoBase, $prepCargo] = cargo_split($cargo_raw);

                        // Prep a usar según dependencia; si no tiene líder, usamos la del cargo; si no, "de la"
                        $depTiene = dep_tiene_lider($dependencia);
                        $prepDep = $depTiene ? prep_desde_dependencia($dependencia) : ($prepCargo ?: 'de la');

                        // Núcleo puro de dependencia
                        $nucleo = dep_nucleo($dependencia);
                    @endphp

                    {{-- L1: Nombre --}}
                    @if ($nombre !== '')
                        <p class="dependencia">{{ $nombre }}</p>
                    @endif

                    {{-- Rector/Rectora: una sola línea con BUAP --}}
                    @if (preg_match('/^rector(a)?$/iu', $cargoBase))
                        <p class="dependencia">{!! nb_pairs($cargoBase . ' de la ' . $BUAP) !!}</p>
                    @else
                        @if ($cargoBase !== '' && $dependencia !== '' && es_cargo_corto($cargoBase))
                            {{-- CARGO CORTO: una sola línea con dependencia y "de la" final (antes de BUAP) --}}
                            <p class="dependencia">{!! nb_pairs($cargoBase . ' ' . $prepDep . ' ' . $nucleo . ' de la') !!}</p>
                            <p class="dependencia">{!! nb_pairs($BUAP) !!}</p>
                        @else
                            {{-- CASO GENERAL: cargo en una línea, dependencia en otra, luego BUAP --}}
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
                    <p class="dependencia">{{ $respuesta?->cargo }} </p>
                    <p class="dependencia">{{ $respuesta?->dependencia }}</p>
                @break

            @endswitch



            <p class="generales" style="font-weight: bold; line-height: 1 !important;">PRESENTE</p>

        </div>
        <br><br>
        <!--  contenido -->
        <div class="contenido-dinamico">

            {!! $contenidoPdf ?? ($respuesta?->respuesta ?? '') !!}
        </div>
        <!--  termina contenido -->
        <br>


        <p class="generales" style="font-style: italic; line-height: 1;">De antemano agradezco su atención y le reitero
            la
            seguridad de mi más distinguida consideración.</p>


        <br>
        <br>
        <div style="position: relative; page-break-inside: avoid;">
            <p class="firma">Atentamente</p>
            <p class="firma">“Pensar bien, para vivir mejor”</p>
            <p class="firma">H. Puebla de Zaragoza a {{ $fechaEscrita }}
            </p>

            <br>
            <br>
            <br>
            <br>



            <p class="firma">Dr. José Jaime Vázquez López</p>
            <p class="firma">Vicerrector de Docencia</p>
            <!-- Descomentart si ya quieren sello y firma
            <img src="{{ public_path('img/sello.png') }}" class="sello-movil" />
            <img src="{{ public_path('img/firma.png') }}" class="firma-movil" />
            -->
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
            <p class="copias">
                C.c.p. Archivo</p>
            <<p class="copias">
                Dr.JJVL/{{ $oficio?->area }}@if ($oficio?->proceso)
                    /{{ $oficio?->proceso }}
                @endif
                </p>
        </div>

</body>

</html>
