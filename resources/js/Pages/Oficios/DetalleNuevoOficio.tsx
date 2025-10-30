import AppLayout from "../../Layouts/app";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { useState, Fragment, FormEventHandler } from "react";
import {
    Card,
    Form,
    Row,
    Col,
    Button,
    Alert,
    Modal,
    ModalHeader,
    ModalBody,
    ModalTitle,
    ModalFooter,
} from "react-bootstrap";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import "filepond/dist/filepond.min.css";
import VerPdf from "@/types/VerPdf";
import { Head } from "@inertiajs/react";
import Swal from "sweetalert2";
import InputError from "../InputError";
import { getFullUrl } from "../../types/url";
// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";

DataTable.use(DT);

export default function DetalleNuevoOficio({
    id,
    oficio,
    destinatariosOficio,
    archivos,
}: {
    id: number;
    oficio: any;
    destinatariosOficio: any[];
    archivos: any[];
}) {
    const [show, setShow] = useState<boolean>(false);
    const [pdf, setPdf] = useState("");
    const [tipo, setTipo] = useState("pdf");

    const verArchivo = (url: string, tipo: number, extension: string) => {
        if (tipo == 1) {
            setPdf(url);
            setTipo(extension);
            setShow(true);
        } else {
            window.open(url, "_blank");
        }
    };

    return (
        <AppLayout>
            <Head>
                <title>Detalle nuevo oficio</title>
                <meta
                    name="Detalle de nuevo oficio"
                    content="Revise el detalle de un nuevo oficio generado por la VD"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Detalle de nuevo oficio"
                    active="Detalle de nuevo oficio"
                    items={[
                        {
                            titulo: "Mis oficios",
                            urlHeader: "/oficios/mis-oficios",
                        },
                    ]}
                />
                <Row className="d-flex justify-content-center">
                    <Col lg={12} xl={6}>
                        <Card>
                            <Card.Header>
                                <Card.Title as="h3">
                                    Detalle del nuevo oficio
                                </Card.Title>
                            </Card.Header>
                            <Card.Body>
                                <div className="form-row">
                                    {oficio.masivo == 1 &&
                                    oficio.archivo.substring(
                                        oficio.archivo.length - 3
                                    ) !== "pdf" ? (
                                        <Col xs={12} style={{ padding: 40 }}>
                                            <a
                                                className="tag tag-radius tag-round tag-outline-danger"
                                                target="_BLANK"
                                                href={getFullUrl(
                                                    `/files/${oficio.archivo}`
                                                )}
                                            >
                                                Click para descargar el archivo
                                                <i
                                                    className="fa fa-file-pdf-o"
                                                    style={{ padding: 6 }}
                                                ></i>
                                            </a>
                                        </Col>
                                    ) : null}

                                    {oficio.masivo == 1 ? (
                                        <>
                                            <Col
                                                xs={12}
                                                style={{ padding: 40 }}
                                                hidden={
                                                    oficio.archivo.substring(
                                                        oficio.archivo.length -
                                                            3
                                                    ) !== "pdf"
                                                        ? true
                                                        : false
                                                }
                                            >
                                                <span
                                                    className="tag tag-radius tag-round tag-outline-danger"
                                                    onClick={() => {
                                                        setPdf(oficio.archivo),
                                                            setTipo("pdf");
                                                        setShow(true);
                                                    }}
                                                >
                                                    Click para ver archivo
                                                    <i
                                                        className="fa fa-file-pdf-o"
                                                        style={{ padding: 6 }}
                                                    ></i>
                                                </span>
                                            </Col>

                                            <Col xs={12} className="mb-5">
                                                <Form.Label>
                                                    Breve descripción del motivo
                                                    del oficio
                                                </Form.Label>
                                                <textarea
                                                    className="form-control"
                                                    defaultValue={
                                                        oficio.descripcion
                                                    }
                                                    disabled
                                                    rows={4}
                                                ></textarea>
                                            </Col>
                                        </>
                                    ) : (
                                        <Col xs={12} className="mb-5">
                                            <DataTable
                                                data={destinatariosOficio}
                                                options={{
                                                    language,
                                                    autoWidth: false,

                                                    ordering: false,
                                                    pageLength: 5,
                                                    lengthMenu: [
                                                        [5, 10, 20, -1],
                                                        [5, 10, 20, "Todos"],
                                                    ],
                                                }}
                                                columns={[
                                                    {
                                                        data: "id",
                                                        title: "Ver oficio",
                                                        width: "10%",
                                                    },
                                                    {
                                                        title: "Nombre",
                                                        data: "nombre",
                                                        width: "30%",
                                                    },
                                                ]}
                                                className="display table-bordered  border-bottom ancho100"
                                                slots={{
                                                    0: (
                                                        data: any,
                                                        row: any
                                                    ) => (
                                                        <div className="text-center">
                                                            <Button
                                                                className="btn-icon ml-1"
                                                                variant="danger"
                                                                title="Ver oficiosss"
                                                                onClick={() => {
                                                                    setPdf(
                                                                        `imprime/nuevo/pdf/${id}/${row.id_usuario}/${row.tipo_usuario}`
                                                                    ),
                                                                        setTipo(
                                                                            "pdf"
                                                                        );
                                                                    setShow(
                                                                        true
                                                                    );
                                                                }}
                                                            >
                                                                <i className="fa fa-file-pdf-o"></i>
                                                            </Button>
                                                        </div>
                                                    ),
                                                }}
                                            ></DataTable>
                                        </Col>
                                    )}

                                    {archivos.length > 0 ? (
                                        <>
                                            <Col xs={12}>
                                                <table className="table table-bordered table-hover table-striped">
                                                    <thead>
                                                        <tr>
                                                            <th colSpan={2}>
                                                                Archivos
                                                                adjuntos
                                                            </th>
                                                        </tr>
                                                        <tr>
                                                            <th>Nombre</th>
                                                            <th>Ver</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {archivos.map((x) => {
                                                            return (
                                                                <tr key={x.id}>
                                                                    <td>
                                                                        {
                                                                            x.nombre
                                                                        }
                                                                    </td>
                                                                    <td>
                                                                        <Button
                                                                            className="btn-icon ml-1"
                                                                            variant="danger"
                                                                            title="Ver PDF del oficio"
                                                                            onClick={() =>
                                                                                verArchivo(
                                                                                    x.url,
                                                                                    x.tipo,
                                                                                    x.extension
                                                                                )
                                                                            }
                                                                        >
                                                                            <i className="fa fa-eye"></i>
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </Col>
                                            <Col
                                                xs={12}
                                                className="mb-5 d-flex justify-content-end"
                                            >
                                                <a
                                                    href={route(
                                                        "oficios.downloadFilesNew",
                                                        {
                                                            id: id,
                                                            tipo: "id_nuevo_oficio",
                                                        }
                                                    )}
                                                    target="_BLANK"
                                                    className="btn btn-warning btn-lg mb-1"
                                                >
                                                    Descargar todos los archivos
                                                    adjuntos&nbsp;&nbsp;
                                                    <i className="fa fa-download"></i>
                                                </a>
                                            </Col>
                                        </>
                                    ) : null}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <VerPdf
                    urlPdf={pdf}
                    show={show}
                    setShow={setShow}
                    tipo={tipo}
                />
            </Fragment>
        </AppLayout>
    );
}
