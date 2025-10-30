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
        
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        
        thead {
            display: table-header-group;
        }
        
        tfoot {
            display: table-footer-group;
        }
        
        
        p {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 0.9 !important;
            font-size: 9pt !important;
        }
        
        table {
            page-break-inside: auto;
            width: 100%;
            border-spacing: 0 !important;
            border-collapse: collapse !important;
        }

        th, td {
            border: 1px solid #000 !important;
            padding: 0 !important;
            padding-left: 6px !important;
        }

        .sello-movil {
            position: absolute;
            top: 45px;
            left: 120px;
            width: 19%;
            z-index: 100000;
            pointer-events: none; /* Opcional: para que no bloquee el texto */
            
        }

        .firma-movil {
            position: absolute;
            top: 53px;
            left: 0px;
            width: 30%;
            z-index: 100000;
            pointer-events: none; /* Opcional: para que no bloquee el texto */
            
        }
    </style>
</head>
<body>
    <img src="{{ public_path('img/minerva_gris.png') }}" class="background" />
    <header>
        <img src="{{ public_path('img/minver_buap_azul.png') }}" width="100" >
    </header>
    <footer>
    <div style="width: 100%; text-align: center; font-size: 10px; color: rgb(136, 136, 136); padding: 4px 0 !important; background: rgba(255,255,255,0.8);">
        <table style="margin: 0 auto;  width: auto;">
            <tr>
                <td style="text-align: right; width: 90px;  vertical-align: top; padding-right: 0 !important; border: none !important; line-height: 0.8 !important;">
                    Universidad<br>para Adultos
                </td>
                <td style=" vertical-align: middle; text-align: center; border: none !important;">
                    <div style="display: inline-block; width: 1.5px; height: 62px; background: #122348; margin: 0 auto; border-radius: 100"></div>
                </td>
                <td style="text-align: left;  vertical-align: top; padding-left: 7px !important; border: none !important; line-height: 0.8 !important;">
                    11 sur 4701. Col. Reforma Agua Azul<br>
                    C.P. 72430 Puebla, Pue.<br>
                    Teléfono: 229 5500, Ext. 1653 y 1602
                </td>
            </tr>
        </table>
    </div>
</footer>
    <div class="content">
       <div ><p style="">Oficio No. {{ $oficio?->siglas }}/{{ $respuesta?->oficio_respuesta }}/{{ date('Y') }}</p></div>
        <br>
       <div >
            <p style="font-family: 'SourceSansPro'; font-weight: bold;">{{ $respuesta?->nombre }}</p>
            <p style="font-family: 'SourceSansPro'; font-weight: bold;">{{ $respuesta?->cargo }}</p>
            <p style="font-family: 'SourceSansPro'; font-weight: bold;">{{ $respuesta?->dependencia }}</p>
            <p style="font-family: 'SourceSansPro'; font-weight: bold;">PRESENTE</p>
        </div>
    <br><br>

    <!--  contenifo -->

        {!! $respuesta?->respuesta ?? '' !!}
    <!--  termina contenido -->
      <br>
      <br>
      
      <p style="font-family: 'SourceSansPro';">De antemano agradezco su atención y le reitero la seguridad de mi más distinguida consideración.</p>


        <br>
        <br>
        <div style="position: relative; page-break-inside: avoid;">
            <p style="font-family: 'SourceSansPro';">Atentamente</p>
            <p style="font-family: 'SourceSansPro';">“Pensar bien, para vivir mejor”</p>
            <p style="font-family: 'SourceSansPro';">H. Puebla de Zaragoza a {{ $fechaEscrita }}</p>
            
            <br>
            <br>
            <br>
            <br>
            
            <p style="font-family: 'SourceSansPro';">Mtro. Ricardo Valderrama Valdez</p>
            <p style="font-family: 'SourceSansPro';">Director</p>
            <!-- Descomentart si ya quieren sello y firma
            <img src="{{ public_path('img/sello.png') }}" class="sello-movil" />
            <img src="{{ public_path('img/firma.png') }}" class="firma-movil" />
            -->
        </div>
    


    <div  style="margin-top: 20px;">
        @foreach($copias as $value)
            <p style="font-family: 'SourceSansPro'; font-size: 10px !important;">
                C.c.p. {{ $value->nombre }}@if($value->cargo) ,{{ $value->cargo }}@endif @if($value->dependencia) ,{{ $value->dependencia }}@endif
            </p>
        @endforeach
        <p style="font-family: 'SourceSansPro'; margin: 0px; font-size: 10px !important;">C.c.p. Archivo</p>
        <p style="font-family: 'SourceSansPro'; margin: 0px; font-size: 10px !important;">Dr.RVV/{{ $oficio?->area }}@if($oficio?->proceso)/{{ $oficio?->proceso }} @endif</p>
    </div>
   
</body>
</html>