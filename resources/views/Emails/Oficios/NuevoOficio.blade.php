<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuevo Oficio</title>
</head>
<body style="font-family: 'Poppins', Arial, sans-serif">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 20px;">
                <table class="content" width="600" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #cccccc;">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="background-color: #122e48; padding: 40px; text-align: center; color: white; font-size: 24px;">
                        Sistema Administrativo VD
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td class="body" style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                        {{ $nombre }} <br>
                        Le notificamos que se le ha asignado un nuevo oficio con número de folio/oficio: {{ $folio }}
                        <br><br>
                            Acceda a la plataforma para poder visualizar y dar seguimiento al oficio, puede dar clic en el siguiente enlace:
                        </td>
                    </tr>

                    <!-- Call to action Button -->
                    <tr>
                        <td style="padding: 0px 40px 0px 40px; text-align: center;">
                            <!-- CTA Button -->
                            <table cellspacing="0" cellpadding="0" style="margin: auto;">
                                <tr>
                                    <td align="center" style="background-color: #345C72; padding: 10px 20px; border-radius: 5px;">
                                        <a href="{{ url('/oficios/mis-oficios') }}" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: bold;">Ver Oficio</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!--
                    <tr>
                        <td class="body" style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                            Se le recuerda que el tiempo máximo para responder al oficio es de 72 horas, las cuales corren a partir de que el oficio fue recibido por parte de recepción.
                        </td>
                    </tr> -->
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="background-color: #122e48; padding: 40px; text-align: center; color: white; font-size: 14px;">
                        BUAP - Vicerrectoría de Docencia
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>