import AppLayout from "@/Layouts/app";
import { Head, Link, useForm } from "@inertiajs/react";
import { useState, Fragment, useRef, FormEventHandler, useEffect } from "react";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import {
    Button,
    Card,
    Col,
    Form,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    Row,
    Tab,
    Tabs,
} from "react-bootstrap";
import $ from "jquery";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import InputError from "../InputError";
import toast from "react-hot-toast";
import VerPdf from "@/types/VerPdf";
import LineaTiempo from "@/types/LineaTiempo";

DataTable.use(DT);

type FormIn = {
    id: number;
    archivo: File | null;
    tipo: string;
};

const OficiosRespuestas = ({
    status,
    oficios,
    nuevos,
}: {
    status?: string;
    oficios: [];
    nuevos: [];
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [show, setShow] = useState(false);
    const [showDos, setShowDos] = useState(false);
    const [showLinea, setShowLinea] = useState(false);
    const [variables, setVariables] = useState({
        urlPdf: "",
        extension: "",
        idOfico: 0,
    });
    const [activos, setActivos] = useState<any[]>();
    const [historico, setHistorico] = useState<any[]>();
    const [informativos, setInformativos] = useState<any[]>();

    useEffect(() => {
        setActivos(
            (oficios || [])
                .filter(
                    (item: any) =>
                        item.archivo_respuesta === null && item.id_area !== "1"
                )
                .map((file: any) => ({
                    ...file,
                }))
        );
        setHistorico(
            (oficios || [])
                .filter(
                    (item: any) =>
                        item.archivo_respuesta !== null && item.id_area !== "1"
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

    const form = useForm<FormIn>({
        id: 0,
        archivo: null,
        tipo: "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // subeEvidenciaRecibidoNuevo
        form.post(route("subeEvidenciaRecibido"), {
            onSuccess: clearForm,
        });
    };

    const handleChangeS = (e: any) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            form.setData("archivo", target.files[0]);
        }
    };

    const clearForm = () => {
        form.setDefaults({
            id: 0,
            archivo: null,
        });
        setShow(false);
        form.reset();

        fileInputRef.current!.value = "";

        toast("Correcto: Se guardo la respuesta del oficio.", {
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
                    name="Oficios con respuestas"
                    content="Lista de oficios con respuestas asignadas."
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
                                    Oficios con respuestas
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
                                                            data: "area",
                                                            title: "Área",
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
                                                                {row.enviado ===
                                                                1 ? (
                                                                    <Button
                                                                        className="btn-icon btn btn-warning"
                                                                        variant="warning"
                                                                        title="Subir confirmación de recibido"
                                                                        onClick={() => {
                                                                            form.clearErrors();
                                                                            form.setData(
                                                                                {
                                                                                    ...data,
                                                                                    id: row.id,
                                                                                    tipo: "respuesta",
                                                                                }
                                                                            );
                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-upload"></i>
                                                                    </Button>
                                                                ) : (
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
                                                                )}
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
                                                            data: "area",
                                                            title: "Área",
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
                                                                        setShowDos(
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

                                                                        setShowDos(
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

                                                                        setShowDos(
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

                                                                        setShowDos(
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
                                                                {row.enviado ===
                                                                1 ? (
                                                                    row.archivo_respuesta ===
                                                                    null ? (
                                                                        <Button
                                                                            className="btn-icon btn btn-warning mr-1"
                                                                            variant="warning"
                                                                            title="Subir confirmación de recibido"
                                                                            onClick={() => {
                                                                                form.clearErrors();
                                                                                form.setData(
                                                                                    {
                                                                                        ...data,
                                                                                        id: row.id,
                                                                                        tipo: "nuevo",
                                                                                    }
                                                                                );
                                                                                setShow(
                                                                                    true
                                                                                );
                                                                            }}
                                                                        >
                                                                            <i className="fa fa-upload"></i>
                                                                        </Button>
                                                                    ) : (
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
                                                                                setShowDos(
                                                                                    true
                                                                                );
                                                                            }}
                                                                        >
                                                                            <i className="fa fa-file-pdf-o"></i>
                                                                        </Button>
                                                                    )
                                                                ) : row.finalizado ===
                                                                  null ? null : (
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
                                                                )}

                                                                <Button
                                                                    className="btn-icon "
                                                                    variant="danger"
                                                                    title="Ver PDF del oficio"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: `imprime/nuevo/pdf/${row.id}`,
                                                                                extension:
                                                                                    "pdf",
                                                                            }
                                                                        );

                                                                        setShowDos(
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
                                    </Tabs>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Modal show={show} onHide={() => setShow(false)}>
                    <ModalHeader>
                        <ModalTitle as="h5">Evidencía de recibido</ModalTitle>
                    </ModalHeader>
                    <form onSubmit={submit}>
                        <ModalBody>
                            <Row>
                                <Col xs={12}>
                                    <Form.Label>
                                        Evidencia de confirmación de recibido:
                                    </Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept=".pdf,.jpg,.png,.jpeg"
                                        className={
                                            form.errors.archivo
                                                ? "inputError"
                                                : ""
                                        }
                                        ref={fileInputRef}
                                        onChange={(e) => handleChangeS(e)}
                                    />

                                    <InputError
                                        className="mt-1"
                                        message={form.errors.archivo}
                                    />
                                </Col>
                            </Row>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="secondary"
                                onClick={() => setShow(false)}
                            >
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit">
                                Subir evidencia
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>

                <VerPdf
                    urlPdf={variables.urlPdf}
                    show={showDos}
                    tipo={variables.extension}
                    setShow={setShowDos}
                />

                <LineaTiempo
                    showLinea={showLinea}
                    setShowLinea={setShowLinea}
                    id={variables.idOfico}
                />
            </Fragment>
        </AppLayout>
    );
};

export default OficiosRespuestas;
