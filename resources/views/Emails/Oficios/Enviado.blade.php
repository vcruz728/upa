<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rechazo de respuesta a oficio</title>
</head>

<body style="font-family: 'Poppins', Arial, sans-serif">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 20px;">
                <table class="content" width="600" border="0" cellspacing="0" cellpadding="0"
                    style="border-collapse: collapse; border: 1px solid #cccccc;">
                    <!-- Header -->
                    <tr>
                        <td class="header"
                            style="background-color: #122e48; padding: 40px; text-align: center; color: white; font-size: 24px;">
                            Sistema Administrativo UPA
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td class="body" style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                            @if ($tipo == 1)
                                Le notificamos que la respuesta del oficio con número de folio/oficio:
                                {{ $folio }}, ha sido aceptada y enviada por parte de recepción documental.
                            @else
                                Le notificamos que el oficio ha sido enviado por parte de recepción documental.
                            @endif
                        </td>
                    </tr>


                    <!-- Footer -->
                    <tr>
                        <td class="footer"
                            style="background-color: #122e48; padding: 40px; text-align: center; color: white; font-size: 14px;">
                            BUAP - Vicerrectoría de Docencia
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>
