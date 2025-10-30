import AppLayout from "../../Layouts/app";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { useState, Fragment, FormEventHandler, useRef } from "react";
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
import toast from "react-hot-toast";

DataTable.use(DT);

type FormIn = {
    id: number;
    archivo: File | null;
    tipo: string;
};

export default function SubeConfirmacion({
    id,
    destinatariosOficio,
}: {
    id: number;
    destinatariosOficio: any[];
}) {
    const user = usePage().props.auth.user;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [show, setShow] = useState<boolean>(false);
    const [showDos, setShowDos] = useState(false);
    const [pdf, setPdf] = useState("");
    const [tipo, setTipo] = useState("pdf");

    const form = useForm<FormIn>({
        id: 0,
        archivo: null,
        tipo: "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route("subeEvidenciaRecibido"), {
            onSuccess: clearForm,
        });
    };
    const clearForm = () => {
        form.setDefaults({
            id: 0,
            archivo: null,
        });
        setShowDos(false);
        form.reset();

        fileInputRef.current!.value = "";

        toast("Correcto: Se guardo la confirmación de recibido del oficio.", {
            style: {
                padding: "25px",
                color: "#fff",
                backgroundColor: "#29bf74",
            },
            position: "top-center",
        });
    };

    const handleChangeS = (e: any) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            form.setData("archivo", target.files[0]);
        }
    };

    return (
        <AppLayout>
            <Head>
                <title>Confirmaciones de recibido</title>
                <meta
                    name="Subir o visualizar las confirmaciones de recibido de los oficios"
                    content="Subir o visualizar las confirmaciones de recibido de los oficios"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Confirmaciones de recibido"
                    active="Detalle de confirmaciones de recibido"
                    items={[]}
                />
                <Row className="d-flex justify-content-center">
                    <Col lg={12} xl={6}>
                        <Card>
                            <Card.Header>
                                <Card.Title as="h3">
                                    Listado de oficios
                                </Card.Title>
                            </Card.Header>
                            <Card.Body>
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
                                            0: (data: any, row: any) => (
                                                <div className="text-center">
                                                    <Button
                                                        className="btn-icon mr-1"
                                                        variant="danger"
                                                        title="Ver oficiosss"
                                                        onClick={() => {
                                                            setPdf(
                                                                `imprime/nuevo/pdf/${id}/${row.id_usuario}/${row.tipo_usuario}`
                                                            ),
                                                                setTipo("pdf");
                                                            setShow(true);
                                                        }}
                                                    >
                                                        <i className="fa fa-file-pdf-o"></i>
                                                    </Button>

                                                    {row.archivo_respuesta ===
                                                        null &&
                                                    user.rol == 5 ? (
                                                        <Button
                                                            className="btn-icon btn btn-warning mr-1"
                                                            variant="warning"
                                                            title="Subir confirmación de recibido"
                                                            onClick={() => {
                                                                form.clearErrors();
                                                                form.setData({
                                                                    ...data,
                                                                    id: row.id,
                                                                    tipo: "destinatario",
                                                                });
                                                                setShowDos(
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
                                                                console.log(
                                                                    row.archivo_respuesta
                                                                );
                                                                setPdf(
                                                                    row.archivo_respuesta
                                                                );
                                                                setTipo(
                                                                    row.extension
                                                                );
                                                                setShow(true);
                                                            }}
                                                        >
                                                            <i className="fa fa-file-pdf-o"></i>
                                                        </Button>
                                                    )}
                                                </div>
                                            ),
                                        }}
                                    ></DataTable>
                                </Col>
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
                <Modal show={showDos} onHide={() => setShowDos(false)}>
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
                                onClick={() => setShowDos(false)}
                            >
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit">
                                Subir evidencia
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>
            </Fragment>
        </AppLayout>
    );
}
