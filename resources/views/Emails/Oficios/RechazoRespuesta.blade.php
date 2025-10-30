<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rechazo de oficio</title>
</head>
<body style="font-family: 'Poppins', Arial, sans-serif">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 20px;">
                <table class="content" width="600" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #cccccc;">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="background-color: #122e48; padding: 40px; text-align: center; color: white; font-size: 24px;">
                        Sistema Administrativo UPA
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td class="body" style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                        {{ $nombre }} <br>
                        @if ($tipo == 1)
                            Le notificamos que la respuesta del oficio con número de folio/oficio: {{ $folio }}, ha sido rechazada por parte de su jefe de área con la siguiente justificación:
                        @else
                            Le notificamos que su oficio ha sido rechazado por parte de su jefe de área con la siguiente justificación:
                        @endif
                        <br><br>
                            {{ $descripcion }}
                        </td>
                    </tr>

                    <!-- Call to action Button -->
                    <tr>
                        <td style="padding: 0px 40px 0px 40px; text-align: center;">
                            <!-- CTA Button -->
                            <table cellspacing="0" cellpadding="0" style="margin: auto;">
                                <tr>
                                    <td align="center" style="background-color: #345C72; padding: 10px 20px; border-radius: 5px;">
                                        @if ($tipo == 1)
                                            <a href="{{ url('/oficios/responder/'.$id_oficio) }}" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: bold;">Ver Oficio</a>
                                        @else
                                            <a href="{{ url('/oficios/nuevo-oficio/'.$id_oficio) }}" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: bold;">Ver Oficio</a>
                                        @endif
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="body" style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                            @if ($tipo == 1)
                                Acceda al sistema para responder nuevamente al oficio.
                            @else
                                Acceda al sistema para responder editar su oficio.
                            @endif
                            
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="background-color: #122e48; padding: 40px; text-align: center; color: white; font-size: 14px;">
                        BUAP - UPA
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>