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

type FormIn = {
    id: number;
    descripcion: string;
    archivo: File | null;
    enrutar: string;
};

export default function FormOficio({
    status,
    id,
    archivos,
    oficio,
}: {
    status?: string;
    id: number;
    archivos: any[];
    oficio: any;
}) {
    const [show, setShow] = useState<boolean>(false);
    const [show3, setShow3] = useState(false);
    const [pdf, setPdf] = useState("");
    const [tipo, setTipo] = useState("pdf");

    const user = usePage().props.auth.user;
    const formRechazo = useForm({
        id: 0,
        descripcion: "",
    });

    const submitRechaza: FormEventHandler = (e) => {
        e.preventDefault();
        Swal.fire({
            title: "¿Está seguro?",
            text: "Se notificará al colaborador para que vuelva a revisar el oficio.",
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
                formRechazo.put(route("rechazarRespNuevo"));
            } else {
                formRechazo.cancel();
            }
        });
    };

    const autorizaResp = () => {
        Swal.fire({
            title: "¿Está seguro?",
            text: "El oficio ya no se podrá editar y se marcará como finalizado",
            icon: "warning",
            showDenyButton: true,
            showCancelButton: false,
            confirmButtonText: "Sí, estoy seguro",
            denyButtonText: `Cancelar`,
        }).then((result) => {
            if (result.isConfirmed) {
                router.put(route("aceptRespNuevo", { id }));
            }
        });
    };

    const verArchivo = (url: string, tipo: number, extension: string) => {
        if (tipo == 1) {
            setPdf(url);
            setShow(true);
            setTipo(extension);
        } else {
            window.open(url, "_blank");
        }
    };

    return (
        <AppLayout>
            <Head>
                <title>Revisión nuevo oficio</title>
                <meta
                    name="Revision de nuevo oficio"
                    content="Revise la estructura de un nuevo oficio generado por la VD"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Revisión de nuevo oficio"
                    active="Revisión de nuevo oficio"
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
                                    ) : (
                                        <Col xs={12} style={{ padding: 40 }}>
                                            <span
                                                className="tag tag-radius tag-round tag-outline-danger"
                                                onClick={() => {
                                                    setPdf(
                                                        oficio.masivo == 1
                                                            ? oficio.archivo
                                                            : `imprime/nuevo/pdf/${id}`
                                                    ),
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
                                    )}

                                    {oficio.masivo == 1 ? (
                                        <Col xs={12} className="mb-5">
                                            <Form.Label>
                                                Breve descripción del motivo del
                                                oficio
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
                                    ) : null}

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
                                                        "oficios.downloadFiles",
                                                        {
                                                            id: id,
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

                                    <Col
                                        xs={12}
                                        xl={6}
                                        xxl={4}
                                        className="d-flex justify-content-center"
                                    >
                                        <Button
                                            className="btn-lg mb-1"
                                            variant="success"
                                            onClick={autorizaResp}
                                        >
                                            Autorizar oficio
                                        </Button>
                                    </Col>

                                    <Col
                                        xs={12}
                                        xl={6}
                                        xxl={4}
                                        className="d-flex justify-content-center"
                                    >
                                        <Button
                                            className="btn-lg mb-1"
                                            variant="danger"
                                            onClick={() => {
                                                setShow3(true),
                                                    formRechazo.setData(
                                                        "id",
                                                        id
                                                    );
                                            }}
                                        >
                                            Rechazar oficio
                                        </Button>
                                    </Col>
                                    {user.rol === 3 ? (
                                        <Col
                                            xs={12}
                                            xl={12}
                                            xxl={4}
                                            className="d-flex justify-content-center"
                                        >
                                            <Link
                                                href={`/oficios/nuevo-oficio/${id}`}
                                                className="btn btn-primary btn-lg"
                                            >
                                                Editar Oficio
                                            </Link>
                                        </Col>
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

                <Modal show={show3} onHide={() => setShow3(false)}>
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
                                onClick={() => setShow3(false)}
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
