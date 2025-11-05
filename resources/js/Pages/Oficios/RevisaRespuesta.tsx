import AppLayout from "../../Layouts/app";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { useState, Fragment, useRef, useEffect, FormEventHandler } from "react";
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
import DatePicker from "react-datepicker";
import { Fecha } from "../../commondata/Fecha";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";

type FormIn = {
    id: number;
    fecha: string | null;
};

export default function RevisaRespuesta({
    status,
    oficio,
    archivos,
}: {
    status?: string;
    oficio: any | null; // <- puede venir null
    archivos: any[] | null; // <- puede venir null
}) {
    const user = usePage().props.auth.user;

    // Normalizamos para evitar "Cannot read properties of null"
    const o = oficio ?? {};
    const adjuntos = archivos ?? [];

    const [show, setShow] = useState<boolean>(false);
    const [show3, setShow3] = useState(false);
    const [pdf, setPdf] = useState("");
    const [tipo, setTipo] = useState("pdf");

    // Helper seguro para fechas
    function parseLocalDate(dateString?: string | null): Date | null {
        if (!dateString) return null;
        const [year, month, day] = dateString.split("-");
        const y = Number(year),
            m = Number(month),
            d = Number(day);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    }

    // Helper para abrir visor PDF solo si hay URL
    const openPdf = (url?: string | null, ext?: string | null) => {
        const clean = (url || "").trim();
        if (!clean) {
            toast.error("No hay archivo para mostrar.");
            return;
        }
        setPdf(clean);
        setTipo((ext || "pdf").toLowerCase());
        setShow(true);
    };

    // Forms inicializados con valores seguros
    const formFecha = useForm<FormIn>({
        id: o?.id_respuesta ?? 0,
        fecha: o?.fecha_respuesta ?? Fecha,
    });

    const formRechazo = useForm({
        id: 0,
        descripcion: "",
    });

    const submitRechaza: FormEventHandler = (e) => {
        e.preventDefault();
        if (!o?.id) return;
        Swal.fire({
            title: "¿Está seguro?",
            text: "Se notificará al colaborador para que vuelva a responder el oficio.",
            icon: "warning",
            showDenyButton: true,
            showCancelButton: false,
            confirmButtonText: "Sí, estoy seguro",
            denyButtonText: `Cancelar`,
            customClass: { container: "swalSuperior" },
        }).then((result) => {
            if (result.isConfirmed) {
                formRechazo.put(route("rechazarResp"));
            } else {
                formRechazo.cancel();
            }
        });
    };

    const submitFecha: FormEventHandler = (e) => {
        e.preventDefault();
        if (!o?.id) return;
        formFecha.post(route("oficios.cambiaFecha"), {
            onSuccess: () => {
                toast(
                    "Correcto: Se actualizó la fecha de respuesta del oficio.",
                    {
                        style: {
                            padding: "25px",
                            color: "#fff",
                            backgroundColor: "#29bf74",
                        },
                        position: "top-center",
                    }
                );
            },
        });
    };

    const autorizaResp = () => {
        if (!o?.id) return;
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
                router.put(route("oficios.aceptResp", { id: o.id }));
            }
        });
    };

    const verArchivo = (url: string, tipo: number, extension: string) => {
        if (tipo === 1) openPdf(url, extension);
        else window.open(url, "_blank");
    };

    const ingresoFisico = o?.ingreso === "Físico" || o?.ingreso === "Fisico";
    const ingresoEmail = o?.ingreso === "Email";

    return (
        <AppLayout>
            <Head>
                <title>Revisión de respuesta del colaborador</title>
                <meta
                    name="Revision de respuesta"
                    content="Revise la respuesta del oficio por parte de su colaborador"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Revisión de respuesta"
                    active="Revisión de respuesta"
                    items={[
                        {
                            titulo: "Mis oficios",
                            urlHeader: "/oficios/mis-oficios",
                        },
                    ]}
                />

                {/* Si no hay oficio, mostramos alerta y salimos */}
                {!o?.id ? (
                    <Alert variant="warning" className="mx-3">
                        No se encontró información del oficio.
                    </Alert>
                ) : (
                    <Row>
                        <Col lg={12} xl={6}>
                            <Card>
                                <Card.Header>
                                    <Card.Title as="h3">
                                        Información del oficio
                                    </Card.Title>
                                </Card.Header>
                                <Card.Body>
                                    <div className="form-row">
                                        <Col xl={4} md={6} className="mb-4">
                                            <Form.Group>
                                                <Form.Label>
                                                    Ingreso de la solicitud
                                                </Form.Label>
                                                <div className="custom-controls-stacked">
                                                    <label className="custom-control custom-radio-md">
                                                        <input
                                                            type="radio"
                                                            className="custom-control-input"
                                                            name="ingreso"
                                                            defaultValue="Físico"
                                                            defaultChecked={
                                                                ingresoFisico
                                                            }
                                                            disabled
                                                        />
                                                        <span className="custom-control-label">
                                                            Físico
                                                        </span>
                                                    </label>
                                                    <label
                                                        className="custom-control custom-radio-md"
                                                        style={{
                                                            marginLeft: "2rem",
                                                        }}
                                                    >
                                                        <input
                                                            type="radio"
                                                            className="custom-control-input"
                                                            name="ingreso"
                                                            defaultValue="Email"
                                                            defaultChecked={
                                                                ingresoEmail
                                                            }
                                                            disabled
                                                        />
                                                        <span className="custom-control-label">
                                                            Email
                                                        </span>
                                                    </label>
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </div>

                                    <div className="form-row">
                                        {ingresoFisico && (
                                            <Col
                                                xs={12}
                                                sm={6}
                                                xl={4}
                                                className="mb-3"
                                            >
                                                <Form.Label>
                                                    Número de oficio
                                                </Form.Label>
                                                <Form.Control
                                                    name="num_oficio"
                                                    defaultValue={
                                                        o?.num_oficio ?? ""
                                                    }
                                                    type="text"
                                                    disabled
                                                />
                                            </Col>
                                        )}

                                        {ingresoEmail && (
                                            <Col
                                                xs={12}
                                                sm={6}
                                                xl={4}
                                                className="mb-3"
                                            >
                                                <Form.Label>
                                                    Número de folio
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    disabled
                                                    name="num_folio"
                                                    defaultValue={
                                                        o?.num_folio ?? ""
                                                    }
                                                />
                                            </Col>
                                        )}

                                        <Col
                                            xs={12}
                                            sm={6}
                                            md={6}
                                            lg={6}
                                            xl={4}
                                            className="mb-3"
                                        >
                                            <Form.Label>
                                                Dependencia o Unidad Académica
                                            </Form.Label>
                                            <Form.Control
                                                defaultValue={o?.des ?? ""}
                                                type="text"
                                                disabled
                                            />
                                        </Col>

                                        <Col
                                            xs={12}
                                            sm={6}
                                            md={6}
                                            lg={6}
                                            xl={4}
                                            className="mb-3"
                                        >
                                            <Form.Label>
                                                Área para dar respuesta
                                            </Form.Label>
                                            <Form.Control
                                                defaultValue={o?.area ?? ""}
                                                type="text"
                                                disabled
                                            />
                                        </Col>

                                        <Col
                                            xs={12}
                                            sm={6}
                                            md={6}
                                            lg={6}
                                            xl={4}
                                            className="mb-3"
                                        >
                                            <Form.Label>
                                                Proceso al que impacta
                                            </Form.Label>
                                            <Form.Control
                                                defaultValue={o?.proceso ?? ""}
                                                type="text"
                                                disabled
                                            />
                                        </Col>

                                        <Col
                                            xs={12}
                                            sm={12}
                                            xl={8}
                                            style={{ padding: 40 }}
                                        >
                                            <span
                                                className="tag tag-radius tag-round tag-outline-danger"
                                                onClick={() =>
                                                    openPdf(o?.archivo, "pdf")
                                                }
                                            >
                                                Click para ver archivo
                                                <i
                                                    className="fa fa-file-pdf-o"
                                                    style={{ padding: 6 }}
                                                />
                                            </span>
                                        </Col>
                                    </div>

                                    <div className="form-row">
                                        <Form.Label>
                                            Breve descripción del asunto:
                                        </Form.Label>
                                        <textarea
                                            className="form-control"
                                            name="descripcion"
                                            defaultValue={o?.descripcion ?? ""}
                                            rows={3}
                                            disabled
                                        ></textarea>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={12} xl={6}>
                            <Card>
                                <Card.Header>
                                    <Card.Title as="h3">
                                        Respuesta del colaborador
                                    </Card.Title>
                                </Card.Header>
                                <Card.Body>
                                    {o?.comentario ? (
                                        <Col xs={12} className="mb-5">
                                            <Form.Label>
                                                Breve descripción del rechazo
                                                por parte de recepción
                                                documental:
                                            </Form.Label>
                                            <textarea
                                                className="form-control"
                                                value={o.comentario}
                                                rows={3}
                                                disabled
                                            ></textarea>
                                        </Col>
                                    ) : null}

                                    <Col xs={12} style={{ padding: 40 }}>
                                        <span
                                            className="tag tag-radius tag-round tag-outline-danger"
                                            onClick={() =>
                                                openPdf(
                                                    `imprime/pdf/0/${o.id}`,
                                                    "pdf"
                                                )
                                            }
                                        >
                                            Click para ver archivo
                                            <i
                                                className="fa fa-file-pdf-o"
                                                style={{ padding: 6 }}
                                            />
                                        </span>
                                    </Col>

                                    {adjuntos.length > 0 ? (
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
                                                        {adjuntos.map(
                                                            (x: any) => (
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
                                                            )
                                                        )}
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
                                                        { id: o.id }
                                                    )}
                                                    target="_BLANK"
                                                    className="btn btn-warning btn-lg mb-1"
                                                    rel="noreferrer"
                                                >
                                                    Descargar todos los archivos
                                                    adjuntos&nbsp;&nbsp;
                                                    <i className="fa fa-download"></i>
                                                </a>
                                            </Col>
                                        </>
                                    ) : null}

                                    {user.rol == 5 ? (
                                        <form onSubmit={submitFecha}>
                                            <Col xs={4}>
                                                <Form.Label>
                                                    Seleccione la fecha de
                                                    respuesta del oficio:
                                                </Form.Label>
                                                <DatePicker
                                                    className="form-control"
                                                    selected={parseLocalDate(
                                                        formFecha.data.fecha
                                                    )}
                                                    onChange={(date) => {
                                                        if (date) {
                                                            const yyyy =
                                                                date.getFullYear();
                                                            const mm = String(
                                                                date.getMonth() +
                                                                    1
                                                            ).padStart(2, "0");
                                                            const dd = String(
                                                                date.getDate()
                                                            ).padStart(2, "0");
                                                            formFecha.setData(
                                                                "fecha",
                                                                `${yyyy}-${mm}-${dd}`
                                                            );
                                                        }
                                                    }}
                                                    dateFormat="yyyy-MM-dd"
                                                />
                                            </Col>
                                            <Col xs={4} className="mt-5">
                                                <Button
                                                    className="btn btn-success "
                                                    type="submit"
                                                    disabled={!o?.id}
                                                >
                                                    Guardar fecha
                                                </Button>
                                            </Col>
                                            <Col xs={12} className="mb-5"></Col>
                                        </form>
                                    ) : null}

                                    <div className="form-row">
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
                                                disabled={!o?.id}
                                            >
                                                {user.rol == 5
                                                    ? "Aceptar respuesta"
                                                    : "Autorizar respuesta"}
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
                                                    setShow3(true);
                                                    formRechazo.setData(
                                                        "id",
                                                        o?.id ?? 0
                                                    );
                                                }}
                                                disabled={!o?.id}
                                            >
                                                Rechazar respuesta
                                            </Button>
                                        </Col>

                                        <Col
                                            xs={12}
                                            xl={12}
                                            xxl={4}
                                            className="d-flex justify-content-center"
                                        >
                                            <Link
                                                href={route("oficioResponder", {
                                                    id: o?.id ?? 0,
                                                })}
                                                className={`btn btn-primary btn-lg ${
                                                    !o?.id ? "disabled" : ""
                                                }`}
                                            >
                                                {user.rol == 5
                                                    ? "Editar respuesta"
                                                    : "Responder oficio (Ignorando respuesta)"}
                                            </Link>
                                        </Col>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                )}

                <VerPdf
                    urlPdf={pdf}
                    show={show}
                    setShow={setShow}
                    tipo={tipo}
                />

                <Modal show={show3} onHide={() => setShow3(false)}>
                    <ModalHeader>
                        <ModalTitle as="h5">
                            Rechazar Respuesta de Oficio
                        </ModalTitle>
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
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={!o?.id}
                            >
                                Rechazar respuesta
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>
            </Fragment>
        </AppLayout>
    );
}
