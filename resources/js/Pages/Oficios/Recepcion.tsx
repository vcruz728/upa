import AppLayout from "../../Layouts/app";
import { Head, Link } from "@inertiajs/react";
import { useState, Fragment, useEffect } from "react";
import { Card, Row, Col, Button, Tabs, Tab } from "react-bootstrap";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import "filepond/dist/filepond.min.css";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "datatables.net-responsive-bs5";
// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import LineaTiempo from "@/types/LineaTiempo";
import $ from "jquery";
import VerPdf from "@/types/VerPdf";

DataTable.use(DT);

export default function Recepcion({ oficios }: { oficios: [] }) {
    const [showLinea, setShowLinea] = useState<boolean>(false);
    const [show, setShow] = useState(false);
    const [idOficio, setIdOficio] = useState(0);
    const [variables, setVariables] = useState({
        urlPdf: "",
        extension: "",
        idOfico: 0,
    });
    const [activos, setActivos] = useState<any[]>();
    const [historico, setHistorico] = useState<any[]>();

    useEffect(() => {
        setActivos(
            (oficios || [])
                .filter((item: any) => item.archivo_respuesta === null)
                .map((file: any) => ({
                    ...file,
                }))
        );
        setHistorico(
            (oficios || [])
                .filter((item: any) => item.archivo_respuesta !== null)
                .map((file: any) => ({
                    ...file,
                }))
        );
    }, [oficios]);
    return (
        <AppLayout>
            <Head>
                <title>Listado de oficios</title>
                <meta
                    name="listado de oficios"
                    content="Visualiza la lista de oficios ingresados a la VD"
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
                                    Listado de oficios
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
                                                className="d-flex justify-content-center"
                                            >
                                                <Link
                                                    className="btn btn-primary"
                                                    href={route(
                                                        "oficios.recepcionOficio"
                                                    )}
                                                >
                                                    <i className="fe fe-plus me-2"></i>
                                                    Nueva recepción
                                                </Link>
                                            </Col>
                                            <Col md={12}>
                                                <DataTable
                                                    data={activos}
                                                    options={{
                                                        language,
                                                        order: [],
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
                                                            data: "ingreso",
                                                            title: "Tipo de ingreso",
                                                        },
                                                        {
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                        },
                                                        {
                                                            data: "des",
                                                            title: "Unidad Académica o Dependencia",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área responsable",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Proceso que impacta",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Acciones",
                                                        },
                                                    ]}
                                                    className="display table-bordered text-nowrap border-bottom"
                                                    slots={{
                                                        7: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <>
                                                                <div className="text-center">
                                                                    <Link
                                                                        className="btn-icon btn btn-warning"
                                                                        href={route(
                                                                            "oficios.modificaOficio",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                    >
                                                                        <i className="fe fe-edit"></i>
                                                                    </Link>
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
                                                            </>
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
                                    </Tabs>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <LineaTiempo
                    showLinea={showLinea}
                    setShowLinea={setShowLinea}
                    id={variables.idOfico}
                />

                <VerPdf
                    urlPdf={variables.urlPdf}
                    show={show}
                    tipo={variables.extension}
                    setShow={setShow}
                />
            </Fragment>
        </AppLayout>
    );
}
