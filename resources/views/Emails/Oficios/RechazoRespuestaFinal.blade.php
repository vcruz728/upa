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

                    @if ($tipoDos == 1)
                        <tr>
                            <td class="body"
                                style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                                {{ $nombre }} <br>
                                Le notificamos que la respuesta del oficio con número de folio/oficio:
                                {{ $folio }}, ha sido rechazada por parte de recepción documental, con la
                                siguiente justificación:
                                <br><br>
                                {{ $descripcion }}
                            </td>
                        </tr>

                        <!-- Call to action Button -->
                        @if ($tipo == 'colaborador' || ($tipo == 'jefe' && $id_usuario === null))
                            <tr>
                                <td style="padding: 0px 40px 0px 40px; text-align: center;">
                                    <!-- CTA Button -->
                                    <table cellspacing="0" cellpadding="0" style="margin: auto;">
                                        <tr>
                                            <td align="center"
                                                style="background-color: #345C72; padding: 10px 20px; border-radius: 5px;">
                                                <a href="{{ url('/oficios/responder/' . $id_oficio) }}" target="_blank"
                                                    style="color: #ffffff; text-decoration: none; font-weight: bold;">Ver
                                                    Oficio</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td class="body"
                                    style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                                    Acceda al sistema para revisar el oficio y tomar las acciones pertinentes.
                                </td>
                            </tr>
                        @else
                            <tr>
                                <td class="body"
                                    style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                                    <strong>Nota:</strong> El colaborador ha sido notificado del rechazo de su
                                    respuesta. Espere a que el colaborador realice las correcciones necesarias y vuelva
                                    a aceptar la respuesta del oficio.
                                </td>
                            </tr>
                        @endif
                    @else
                        <tr>
                            <td class="body"
                                style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                                {{ $nombre }} <br>
                                Le notificamos que su oficio , ha sido rechazada por parte de recepción documental, con
                                la siguiente justificación:
                                <br><br>
                                {{ $descripcion }}
                            </td>
                        </tr>

                        <!-- Call to action Button -->
                        @if ($tipo == 'colaborador' || ($tipo == 'jefe' && $id_usuario === null))
                            <tr>
                                <td style="padding: 0px 40px 0px 40px; text-align: center;">
                                    <!-- CTA Button -->
                                    <table cellspacing="0" cellpadding="0" style="margin: auto;">
                                        <tr>
                                            <td align="center"
                                                style="background-color: #345C72; padding: 10px 20px; border-radius: 5px;">
                                                <a href="{{ url('/oficios/nuevo-oficio/' . $id_oficio) }}" target="_blank"
                                                    style="color: #ffffff; text-decoration: none; font-weight: bold;">Ver
                                                    Oficio</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td class="body"
                                    style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                                    Acceda al sistema para revisar el oficio y tomar las acciones pertinentes.
                                </td>
                            </tr>
                        @else
                            <tr>
                                <td class="body"
                                    style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                                    <strong>Nota:</strong> El colaborador ha sido notificado del rechazo de su oficio.
                                    Espere a que el colaborador realice las correcciones necesarias y vuelva a aceptar
                                    el oficio.
                                </td>
                            </tr>
                        @endif


                    @endif

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
