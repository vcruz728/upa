import AppLayout from "../../Layouts/app";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { useState, Fragment, useRef, FormEventHandler, useEffect } from "react";
import {
    Card,
    Row,
    Col,
    Button,
    Modal,
    ModalHeader,
    ModalTitle,
    ModalBody,
    ModalFooter,
    Form,
    Alert,
    Tabs,
    Tab,
} from "react-bootstrap";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import "filepond/dist/filepond.min.css";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import VerPdf from "@/types/VerPdf";
import Select, { SelectInstance } from "react-select";
import InputError from "../InputError";
import { getFullUrl } from "../../types/url";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import $ from "jquery";
import LineaTiempo from "@/types/LineaTiempo";

DataTable.use(DT);
export default function Recepcion({
    status,
    oficios,
    usuariosSelect,
    procesos,
    nuevos,
}: {
    status?: string;
    usuariosSelect: [];
    oficios: [];
    procesos: [];
    nuevos: [];
}) {
    const user = usePage().props.auth.user;
    const [show, setShow] = useState<boolean>(false);
    const [show2, setShow2] = useState(false);
    const [show4, setShow4] = useState(false);
    const [showLinea, setShowLinea] = useState<boolean>(false);

    const [procesosSelect, setProcesosSelect] = useState([]);
    const [textos, setTextos] = useState({
        textoRechazo: "",
    });
    const [variables, setVariables] = useState({
        urlPdf: "",
        extension: "",
        idOfico: 0,
    });

    const selectPro = useRef<SelectInstance>(null);
    const [activos, setActivos] = useState<any[]>();
    const [historico, setHistorico] = useState<any[]>();
    const [informativos, setInformativos] = useState<any[]>();

    useEffect(() => {
        setActivos(
            (oficios || [])
                .filter(
                    (item: any) =>
                        item.archivo_respuesta === null && item.id_area != "1"
                )
                .map((file: any) => ({
                    ...file,
                }))
        );
        setHistorico(
            (oficios || [])
                .filter(
                    (item: any) =>
                        item.archivo_respuesta !== null && item.id_area != "1"
                )
                .map((file: any) => ({
                    ...file,
                }))
        );

        setInformativos(
            (oficios || [])
                .filter((item: any) => item.id_area === "1")
                .map((file: any) => ({
                    ...file,
                }))
        );
    }, [oficios]);

    const formResponsable = useForm({
        id: "",
        proceso_impacta: "",
        usuario: "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        formResponsable.post(route("oficioAsignaResponsable"), {
            onSuccess: successUsuario,
        });
    };

    const formRechazo = useForm({
        id: 0,
        descripcion: "",
    });

    const submitRechaza: FormEventHandler = (e) => {
        e.preventDefault();
        Swal.fire({
            title: "¿Está seguro?",
            text: "Se notificará al jefe de área y ya no podrá ver el oficio",
            icon: "warning",
            showDenyButton: true,
            showCancelButton: false,
            confirmButtonText: "Sí, estoy seguro",
            denyButtonText: `Cancelar`,
            customClass: {
                container: "swalSuperior",
            },
        }).then((result) => {
            if (result.isConfirmed) {
                formRechazo.post(route("rechazaOFicio"), {
                    onSuccess: successRechazo,
                });
            } else {
                formRechazo.cancel();
            }
        });
    };

    const modalAsigna = async (datos: any) => {
        formResponsable.clearErrors();
        formResponsable.setData("id", datos.id);

        setProcesosSelect(procesos);

        setTimeout(() => {
            selectPro.current!.setValue(
                {
                    value: datos.proceso_impacta,
                    label: datos.proceso,
                },
                "select-option"
            );
        }, 200);

        setShow2(true);
    };

    const successUsuario = () => {
        formResponsable.reset();
        setShow2(false);
        toast("Correcto: Se asigno un responsable al oficio.", {
            style: {
                padding: "25px",
                color: "#fff",
                backgroundColor: "#29bf74",
            },
            position: "top-center",
        });
    };

    const successRechazo = () => {
        formRechazo.reset();
        setShow4(false);
        toast("Correcto: Se rechazo el oficio.", {
            style: {
                padding: "25px",
                color: "#fff",
                backgroundColor: "#29bf74",
            },
            position: "top-center",
        });
    };

    return (
        <AppLayout>
            <Head>
                <title>Mis oficios</title>
                <meta
                    name="listado de mis oficios asignados"
                    content="Lista de oficios asignados"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Listado de oficios"
                    active="Listado de oficios"
                    items={[]}
                />
                <Row>
                    <Col lg={12} md={12}>
                        <Card>
                            <Card.Header className="d-flex justify-content-between">
                                <Card.Title as="h3">
                                    Mis oficios asignados
                                </Card.Title>
                                <div className="tags">
                                    <span className="tag tag-radius tag-round tag-verde">
                                        Se dio respuesta en tiempo
                                    </span>

                                    <span className="tag tag-radius tag-round tag-amarillo">
                                        Sin respuesta, en tiempo
                                    </span>

                                    <span className="tag tag-radius tag-round tag-naranja">
                                        Sin respuesta, fuera de tiempo
                                    </span>

                                    <span className="tag tag-radius tag-round tag-rojo">
                                        Se dio respuesta fuera de tiempo
                                    </span>
                                </div>
                                <div className="tags"></div>
                            </Card.Header>
                            <Card.Body>
                                <div className="panel panel-default">
                                    <Tabs defaultActiveKey="tab1">
                                        <Tab eventKey="tab1" title="Activos">
                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
                                                <DataTable
                                                    data={activos}
                                                    options={{
                                                        language,
                                                        autoWidth: false,
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "id",
                                                            title: "Estatus",

                                                            createdCell(
                                                                cell,
                                                                cellData,
                                                                rowData,
                                                                row,
                                                                col
                                                            ) {
                                                                $(cell).css(
                                                                    "background",
                                                                    rowData.color
                                                                );
                                                                $(cell).css(
                                                                    "color",
                                                                    rowData.color
                                                                );
                                                            },
                                                            width: "5%",
                                                        },
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de ingreso",
                                                            width: "10%",
                                                        },
                                                        {
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                            width: "5%",
                                                        },
                                                        {
                                                            data: "responsable",
                                                            title: "Responsable",
                                                            width: "10%",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Proceso",
                                                            width: "10%",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Breve descripción",
                                                            width: "40%",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            width: "15%",
                                                            title: "Acciones",
                                                        },
                                                    ]}
                                                    className="display table-bordered  border-bottom ancho100"
                                                    slots={{
                                                        6: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div className="text-center">
                                                                {row.respuesta >
                                                                    0 &&
                                                                row.finalizado ===
                                                                    null &&
                                                                user.rol ==
                                                                    3 ? (
                                                                    <Link
                                                                        href={route(
                                                                            "viewRespOficio",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                    >
                                                                        <Button
                                                                            className="btn-icon btn btn-warning mr-1"
                                                                            variant="primary"
                                                                            title="Revisar respuesta"
                                                                        >
                                                                            <i className="zmdi zmdi-pin-account"></i>{" "}
                                                                        </Button>
                                                                    </Link>
                                                                ) : null}

                                                                {row.respuesta ==
                                                                0 ? (
                                                                    <Link
                                                                        href={route(
                                                                            "oficioResponder",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                        style={{
                                                                            color: "white",
                                                                        }}
                                                                        hidden={
                                                                            row.id_usuario !==
                                                                                null &&
                                                                            user.rol ==
                                                                                3
                                                                                ? true
                                                                                : false
                                                                        }
                                                                    >
                                                                        <Button
                                                                            className="btn-icon btn btn-warning"
                                                                            variant={
                                                                                user.rol ==
                                                                                    4 &&
                                                                                (row.descripcion_rechazo_jefe !==
                                                                                    null ||
                                                                                    row.descripcion_rechazo_final !==
                                                                                        null)
                                                                                    ? "danger"
                                                                                    : "warning"
                                                                            }
                                                                            title={
                                                                                "Responder al oficio"
                                                                            }
                                                                        >
                                                                            <i className="fa fa-mail-reply"></i>
                                                                        </Button>
                                                                    </Link>
                                                                ) : (
                                                                    <Button
                                                                        className="btn-icon btn btn-warning"
                                                                        variant="danger"
                                                                        title="Ver respuesta al oficio"
                                                                        onClick={() => {
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    urlPdf: `imprime/pdf/0/${row.id}`,
                                                                                    extension:
                                                                                        "pdf",
                                                                                }
                                                                            );

                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-file-pdf-o"></i>
                                                                    </Button>
                                                                )}

                                                                {user.rol ==
                                                                    3 ||
                                                                user.rol ==
                                                                    1 ? (
                                                                    <Button
                                                                        className="btn-icon btn ml-1"
                                                                        variant={
                                                                            row.descripcion_rechazo ===
                                                                            null
                                                                                ? "primary"
                                                                                : "danger"
                                                                        }
                                                                        title={
                                                                            row.descripcion_rechazo ===
                                                                            null
                                                                                ? "Asignar responsable"
                                                                                : "Reasignar un responsable"
                                                                        }
                                                                        onClick={() => {
                                                                            modalAsigna(
                                                                                row
                                                                            ),
                                                                                setTextos(
                                                                                    {
                                                                                        ...textos,
                                                                                        textoRechazo:
                                                                                            row.descripcion_rechazo,
                                                                                    }
                                                                                );
                                                                        }}
                                                                        hidden={
                                                                            row.id_usuario !==
                                                                                null ||
                                                                            row.respuesta >
                                                                                0
                                                                                ? true
                                                                                : false
                                                                        }
                                                                    >
                                                                        <i className="fa fa-male"></i>
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        className="btn-icon btn ml-1"
                                                                        variant="primary"
                                                                        title="Rechazar responsabilidad"
                                                                        onClick={() => {
                                                                            formRechazo.setData(
                                                                                "id",
                                                                                row.id
                                                                            ),
                                                                                setShow4(
                                                                                    true
                                                                                );
                                                                        }}
                                                                        disabled={
                                                                            row.respuesta ==
                                                                            0
                                                                                ? false
                                                                                : true
                                                                        }
                                                                    >
                                                                        <i className="fa fa-times"></i>
                                                                    </Button>
                                                                )}

                                                                <Button
                                                                    className="btn-icon ml-1"
                                                                    variant="danger"
                                                                    title="Ver PDF del oficio"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.archivo,
                                                                                extension:
                                                                                    "pdf",
                                                                            }
                                                                        );
                                                                        setShow(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-eye"></i>
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                        <Tab eventKey="tab2" title="Histórico">
                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
                                                <DataTable
                                                    data={historico}
                                                    options={{
                                                        language,
                                                        autoWidth: false,
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "id",
                                                            title: "Estatus",

                                                            createdCell(
                                                                cell,
                                                                cellData,
                                                                rowData,
                                                                row,
                                                                col
                                                            ) {
                                                                $(cell).css(
                                                                    "background",
                                                                    rowData.color
                                                                );
                                                                $(cell).css(
                                                                    "color",
                                                                    rowData.color
                                                                );
                                                            },
                                                        },
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de ingreso",
                                                        },
                                                        {
                                                            data: "des",
                                                            title: "Ingreso",
                                                        },
                                                        {
                                                            data: "destinatario",
                                                            title: "Destinatario",
                                                        },
                                                        {
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Proceso",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Breve descripción",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Acciones",
                                                        },
                                                    ]}
                                                    className="display table-bordered  border-bottom ancho100"
                                                    slots={{
                                                        8: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div className="text-center">
                                                                <Button
                                                                    className="btn-icon btn btn-warning"
                                                                    variant="danger"
                                                                    title="Ver confirmación de recibido"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.archivo_respuesta,
                                                                                extension:
                                                                                    row.extension,
                                                                            }
                                                                        );
                                                                        setShow(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-file-pdf-o"></i>
                                                                </Button>

                                                                <Button
                                                                    className="btn-icon btn btn-warning ml-1"
                                                                    variant="danger"
                                                                    title="Ver respuesta al oficio"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.oficio_final,
                                                                                extension:
                                                                                    "pdf",
                                                                            }
                                                                        );

                                                                        setShow(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-file-pdf-o"></i>
                                                                </Button>

                                                                <Button
                                                                    className="btn-icon ml-1"
                                                                    variant="danger"
                                                                    title="Ver PDF del oficio"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.archivo,
                                                                                extension:
                                                                                    "pdf",
                                                                            }
                                                                        );

                                                                        setShow(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-eye"></i>
                                                                </Button>

                                                                <Button
                                                                    className="btn-icon ml-1"
                                                                    variant="success"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                idOfico:
                                                                                    row.id,
                                                                            }
                                                                        );
                                                                        setShowLinea(
                                                                            true
                                                                        );
                                                                    }}
                                                                    title="Ver línea de tiempo del oficio"
                                                                >
                                                                    <i className="fa fa-history"></i>
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                        <Tab
                                            eventKey="tab3"
                                            title="Informativos"
                                        >
                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
                                                <DataTable
                                                    data={informativos}
                                                    options={{
                                                        language,
                                                        autoWidth: false,
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de ingreso",
                                                            width: "10%",
                                                        },
                                                        {
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                            width: "5%",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Breve descripción",
                                                            width: "40%",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            width: "15%",
                                                            title: "Acciones",
                                                        },
                                                    ]}
                                                    className="display table-bordered  border-bottom ancho100"
                                                    slots={{
                                                        3: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div className="text-center">
                                                                <Button
                                                                    className="btn-icon "
                                                                    variant="danger"
                                                                    title="Ver PDF del oficio"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.archivo,
                                                                                extension:
                                                                                    "pdf",
                                                                            }
                                                                        );

                                                                        setShow(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-eye"></i>
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                        <Tab eventKey="tab4" title="Oficios VD">
                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
                                                <DataTable
                                                    data={nuevos}
                                                    options={{
                                                        language,
                                                        autoWidth: false,
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de creación",
                                                            width: "10%",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área",
                                                            width: "10%",
                                                        },
                                                        {
                                                            data: "destinatario",
                                                            title: "Destinatario",
                                                            width: "10%",
                                                        },
                                                        {
                                                            data: "id",
                                                            width: "15%",
                                                            title: "Acciones",
                                                        },
                                                    ]}
                                                    className="display table-bordered  border-bottom ancho100"
                                                    slots={{
                                                        3: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div className="text-center">
                                                                {row.revision >
                                                                    0 &&
                                                                row.finalizado ===
                                                                    null &&
                                                                user.rol == 3 &&
                                                                row.id_usuario !==
                                                                    null ? (
                                                                    <Link
                                                                        href={route(
                                                                            "viewRespNuevoOficio",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                    >
                                                                        <Button
                                                                            className="btn-icon btn btn-warning mr-1"
                                                                            variant="primary"
                                                                            title="Revisar respuesta"
                                                                        >
                                                                            <i className="zmdi zmdi-pin-account"></i>{" "}
                                                                        </Button>
                                                                    </Link>
                                                                ) : null}

                                                                {row.archivo_respuesta ===
                                                                null ? null : (
                                                                    <Button
                                                                        className="btn-icon btn btn-warning mr-1"
                                                                        variant="danger"
                                                                        title="Ver confirmación de recibido"
                                                                        onClick={() => {
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    urlPdf: row.archivo_respuesta,
                                                                                    extension:
                                                                                        row.extension,
                                                                                }
                                                                            );
                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-file-pdf-o"></i>
                                                                    </Button>
                                                                )}

                                                                {user.rol ==
                                                                    3 &&
                                                                row.id_usuario ===
                                                                    null &&
                                                                row.finalizado ===
                                                                    null &&
                                                                row.enviado ===
                                                                    null ? (
                                                                    <Link
                                                                        href={route(
                                                                            "nuevoOficio",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                        style={{
                                                                            color: "white",
                                                                        }}
                                                                    >
                                                                        <Button
                                                                            className="btn-icon btn btn-warning mr-1"
                                                                            variant={
                                                                                row.descripcion_rechazo_final !==
                                                                                null
                                                                                    ? "danger"
                                                                                    : "warning"
                                                                            }
                                                                            title="editar el oficio"
                                                                        >
                                                                            <i className="fa fa-mail-reply"></i>
                                                                        </Button>
                                                                    </Link>
                                                                ) : null}

                                                                {user.rol ==
                                                                    4 &&
                                                                row.id_usuario !==
                                                                    null &&
                                                                row.finalizado ===
                                                                    null &&
                                                                row.enviado ===
                                                                    null &&
                                                                row.revision ===
                                                                    0 ? (
                                                                    <Link
                                                                        href={route(
                                                                            "nuevoOficio",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                        style={{
                                                                            color: "white",
                                                                        }}
                                                                    >
                                                                        <Button
                                                                            className="btn-icon btn btn-warning mr-1"
                                                                            variant={
                                                                                row.descripcion_rechazo_final !==
                                                                                    null ||
                                                                                row.descripcion_rechazo_jefe !==
                                                                                    null
                                                                                    ? "danger"
                                                                                    : "warning"
                                                                            }
                                                                            title="editar el oficio"
                                                                        >
                                                                            <i className="fa fa-mail-reply"></i>
                                                                        </Button>
                                                                    </Link>
                                                                ) : null}

                                                                {row.masivo ==
                                                                    1 &&
                                                                row.archivo !==
                                                                    null &&
                                                                row.archivo.substring(
                                                                    row?.archivo
                                                                        .length -
                                                                        3
                                                                ) !== "pdf" ? (
                                                                    <Button
                                                                        className="btn-icon"
                                                                        variant="primary"
                                                                        title="Ver Word del oficio"
                                                                        onClick={() => {
                                                                            window.open(
                                                                                getFullUrl(
                                                                                    `/files/${row.archivo}`
                                                                                ),
                                                                                "_blank"
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-eye"></i>
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        className="btn-icon "
                                                                        variant="danger"
                                                                        title="Ver PDF del oficio"
                                                                        onClick={() => {
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    urlPdf:
                                                                                        row.masivo ==
                                                                                        1
                                                                                            ? row.archivo
                                                                                            : `imprime/nuevo/pdf/${row.id}`,
                                                                                    extension:
                                                                                        "pdf",
                                                                                }
                                                                            );

                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-eye"></i>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                    </Tabs>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <VerPdf
                    urlPdf={variables.urlPdf}
                    show={show}
                    tipo={variables.extension}
                    setShow={setShow}
                />

                <LineaTiempo
                    showLinea={showLinea}
                    setShowLinea={setShowLinea}
                    id={variables.idOfico}
                />

                <Modal size="xl" show={show2} onHide={() => setShow2(false)}>
                    <ModalHeader>
                        <ModalTitle as="h5">
                            Asignación de responsable
                        </ModalTitle>
                    </ModalHeader>
                    <form onSubmit={submit}>
                        <ModalBody>
                            <Row>
                                {textos.textoRechazo !== null ? (
                                    <Col xs={12}>
                                        <Form.Label>
                                            Breve descripción del rechazo por
                                            parte del colaborador:
                                        </Form.Label>
                                        <textarea
                                            className="form-control"
                                            value={textos.textoRechazo}
                                            rows={3}
                                            disabled
                                        ></textarea>
                                    </Col>
                                ) : null}
                                <Col xs={12} sm={6} xl={4}>
                                    <Form.Label>
                                        Proceso al que impacta
                                    </Form.Label>
                                    <Select
                                        classNamePrefix="Select"
                                        options={procesosSelect}
                                        ref={selectPro}
                                        name="proceso_impacta"
                                        className={
                                            formResponsable.errors
                                                .proceso_impacta
                                                ? "inputError"
                                                : ""
                                        }
                                        defaultValue={
                                            formResponsable.data.proceso_impacta
                                        }
                                        onChange={(e: any) =>
                                            formResponsable.setData(
                                                "proceso_impacta",
                                                e?.value
                                            )
                                        }
                                        placeholder="Seleccione una opción"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={
                                            formResponsable.errors
                                                .proceso_impacta
                                        }
                                    />
                                </Col>
                                <Col xs={12} sm={6} xl={4}>
                                    <Form.Label>Usuario responsable</Form.Label>
                                    <Select
                                        classNamePrefix="Select"
                                        options={usuariosSelect}
                                        name="usuario"
                                        className={
                                            formResponsable.errors.usuario
                                                ? "inputError"
                                                : ""
                                        }
                                        defaultValue={
                                            formResponsable.data.usuario
                                        }
                                        onChange={(e: any) =>
                                            formResponsable.setData(
                                                "usuario",
                                                e?.value
                                            )
                                        }
                                        placeholder="Seleccione una opción"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={formResponsable.errors.usuario}
                                    />
                                </Col>
                            </Row>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="secondary"
                                onClick={() => setShow2(false)}
                            >
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit">
                                Asignar responsable
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>

                <Modal show={show4} onHide={() => setShow4(false)}>
                    <ModalHeader>
                        <ModalTitle as="h5">Rechazar Oficio</ModalTitle>
                    </ModalHeader>
                    <form onSubmit={submitRechaza}>
                        <ModalBody>
                            <Row>
                                <Col xs={12}>
                                    <Form.Label>
                                        Breve descripción del motivo del
                                        rechazo:
                                    </Form.Label>
                                    <textarea
                                        className={
                                            formRechazo.errors.descripcion
                                                ? "form-control inputError"
                                                : "form-control"
                                        }
                                        name="descripcion"
                                        value={formRechazo.data.descripcion}
                                        onChange={(e) =>
                                            formRechazo.setData(
                                                "descripcion",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Máximo 500 caracteres"
                                        rows={2}
                                    ></textarea>
                                    <InputError
                                        className="mt-1"
                                        message={formRechazo.errors.descripcion}
                                    />
                                </Col>
                            </Row>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="secondary"
                                onClick={() => setShow4(false)}
                            >
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit">
                                Rechazar oficio
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>
            </Fragment>
        </AppLayout>
    );
}
