import AppLayout from "../../Layouts/app";
import { Head, router, useForm } from "@inertiajs/react";
import { useState, Fragment, useEffect, FormEventHandler } from "react";
import {
    Card,
    Row,
    Col,
    Button,
    Tabs,
    Tab,
    Modal,
    ModalHeader,
    ModalBody,
    ModalTitle,
    ModalFooter,
    Form,
} from "react-bootstrap";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import "filepond/dist/filepond.min.css";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "datatables.net-responsive-bs5";
// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import InputError from "../InputError";
import Swal from "sweetalert2";
import toast from "react-hot-toast";

DataTable.use(DT);

export default function DestinatariosExternos({
    destinatarios,
}: {
    destinatarios: [];
}) {
    const [show, setShow] = useState(false);
    const [activos, setActivos] = useState<any[]>();
    const [inactivos, setInactivos] = useState<any[]>();

    const formDestinatario = useForm({
        id: 0,
        nombre: "",
        cargo: "",
        dependencia: "",
        email: "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        formDestinatario.post(route("catalogos.saveDestinatario"), {
            onSuccess: successDestinatario,
        });
    };

    const successDestinatario = () => {
        limpiaFormulario();
        setShow(false);
    };

    const limpiaFormulario = () => {
        formDestinatario.setDefaults({
            id: 0,
            nombre: "",
            cargo: "",
            dependencia: "",
            email: "",
        });
        formDestinatario.reset();
    };

    useEffect(() => {
        setActivos(
            (destinatarios || [])
                .filter((item: any) => item.deleted_at === null)
                .map((file: any) => ({
                    ...file,
                }))
        );
        setInactivos(
            (destinatarios || [])
                .filter((item: any) => item.deleted_at !== null)
                .map((file: any) => ({
                    ...file,
                }))
        );
    }, [destinatarios]);

    const delCopia = (id: number) => {
        Swal.fire({
            title: "¿Está seguro?",
            text: "El destinatario ya no aparecera en las listas de destinatarios externos en los demas modulos.",
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
                router.delete(route("catalogos.deleteDestinatario", { id }), {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        toast("Correcto: Se elimino el destinatario externo.", {
                            style: {
                                padding: "25px",
                                color: "#fff",
                                backgroundColor: "#29bf74",
                            },
                            position: "top-center",
                        });
                    },
                });
            }
        });
    };

    const reactivateDestinatario = (id: number) => {
        Swal.fire({
            title: "¿Está seguro?",
            text: "El destinatario aparecera en las listas de destinatarios externos en los demas modulos.",
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
                router.put(
                    route("catalogos.reactivateDestinatario", { id }),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            toast(
                                "Correcto: Destinatario externo reactivado exitosamente.",
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
                    }
                );
            }
        });
    };

    return (
        <AppLayout>
            <Head>
                <title>Destinatarios externos</title>
                <meta
                    name="listado de destinatarios externos"
                    content="Agrega y lista destinatarios externos por área"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Listado de destinatarios externos"
                    active="Listado de destinatarios externos"
                    items={[]}
                />
                <Row>
                    <Col lg={12} md={12}>
                        <Card>
                            <Card.Header className="d-flex justify-content-between">
                                <Card.Title as="h3">
                                    Listado de destinatarios externos
                                </Card.Title>
                            </Card.Header>
                            <Card.Body>
                                <div className="panel panel-default">
                                    <Tabs defaultActiveKey="tab1">
                                        <Tab eventKey="tab1" title="Activos">
                                            <Col
                                                md={12}
                                                className="d-flex justify-content-center"
                                            >
                                                <Button
                                                    className="btn btn-primary"
                                                    onClick={() => {
                                                        limpiaFormulario();
                                                        setShow(true);
                                                    }}
                                                >
                                                    <i className="fe fe-plus me-2"></i>
                                                    Nuevo destinatario
                                                </Button>
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
                                                            data: "nombre",
                                                            title: "Nombre",
                                                        },
                                                        {
                                                            data: "cargo",
                                                            title: "Cargo",
                                                        },
                                                        {
                                                            data: "dependencia",
                                                            title: "Dependencia",
                                                        },
                                                        {
                                                            data: "email",
                                                            title: "Correo electrónico",
                                                        },
                                                    ]}
                                                    className="display table-bordered text-nowrap border-bottom"
                                                    slots={{
                                                        4: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <>
                                                                <div className="text-center">
                                                                    <Button
                                                                        className="btn-icon ml-1"
                                                                        variant="warning"
                                                                        onClick={() => {
                                                                            formDestinatario.setData(
                                                                                {
                                                                                    id: row.id,
                                                                                    nombre: row.nombre,
                                                                                    cargo: row.cargo,
                                                                                    dependencia:
                                                                                        row.dependencia,
                                                                                    email: row.email,
                                                                                }
                                                                            );
                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                        title="Editar destinatario externo"
                                                                    >
                                                                        <i className="fa fa-edit"></i>
                                                                    </Button>

                                                                    <Button
                                                                        className="btn-icon ml-1"
                                                                        variant="danger"
                                                                        onClick={() => {
                                                                            delCopia(
                                                                                row.id
                                                                            );
                                                                        }}
                                                                        title="Eliminar destinatario externo"
                                                                    >
                                                                        <i className="fa fa-trash"></i>
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                        <Tab eventKey="tab2" title="Inactivos">
                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
                                                <DataTable
                                                    data={inactivos}
                                                    options={{
                                                        language,
                                                        order: [],
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "nombre",
                                                            title: "Nombre",
                                                        },
                                                        {
                                                            data: "cargo",
                                                            title: "Cargo",
                                                        },
                                                        {
                                                            data: "dependencia",
                                                            title: "Dependencia",
                                                        },
                                                        {
                                                            data: "email",
                                                            title: "Correo electrónico",
                                                        },
                                                    ]}
                                                    className="display table-bordered text-nowrap border-bottom"
                                                    slots={{
                                                        4: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <>
                                                                <div className="text-center">
                                                                    <Button
                                                                        className="btn-icon ml-1"
                                                                        variant="success"
                                                                        title="Activar destinatario externo"
                                                                        onClick={() => {
                                                                            reactivateDestinatario(
                                                                                row.id
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-repeat"></i>
                                                                    </Button>
                                                                </div>
                                                            </>
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

                <Modal size="xl" show={show} onHide={() => setShow(false)}>
                    <ModalHeader>
                        <ModalTitle as="h5">Destinatario externo</ModalTitle>
                    </ModalHeader>
                    <form onSubmit={submit}>
                        <ModalBody>
                            <Row>
                                <Col xs={12} sm={6}>
                                    <Form.Label>Nombre</Form.Label>
                                    <Form.Control
                                        name="nombre"
                                        className={
                                            formDestinatario.errors.nombre
                                                ? "inputError"
                                                : ""
                                        }
                                        value={formDestinatario.data.nombre}
                                        onChange={(e) =>
                                            formDestinatario.setData(
                                                "nombre",
                                                e.target.value
                                            )
                                        }
                                        type="text"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={formDestinatario.errors.nombre}
                                    />
                                </Col>

                                <Col xs={12} sm={6}>
                                    <Form.Label>Cargo</Form.Label>
                                    <Form.Control
                                        name="cargo"
                                        className={
                                            formDestinatario.errors.cargo
                                                ? "inputError"
                                                : ""
                                        }
                                        value={formDestinatario.data.cargo}
                                        onChange={(e) =>
                                            formDestinatario.setData(
                                                "cargo",
                                                e.target.value
                                            )
                                        }
                                        type="text"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={formDestinatario.errors.cargo}
                                    />
                                </Col>

                                <Col xs={12} sm={6}>
                                    <Form.Label>Dependencia</Form.Label>
                                    <Form.Control
                                        name="dependencia"
                                        className={
                                            formDestinatario.errors.dependencia
                                                ? "inputError"
                                                : ""
                                        }
                                        value={
                                            formDestinatario.data.dependencia
                                        }
                                        onChange={(e) =>
                                            formDestinatario.setData(
                                                "dependencia",
                                                e.target.value
                                            )
                                        }
                                        type="text"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={
                                            formDestinatario.errors.dependencia
                                        }
                                    />
                                </Col>

                                <Col xs={12} sm={6}>
                                    <Form.Label>Correo electrónico</Form.Label>
                                    <Form.Control
                                        name="email"
                                        className={
                                            formDestinatario.errors.email
                                                ? "inputError"
                                                : ""
                                        }
                                        value={formDestinatario.data.email}
                                        onChange={(e) =>
                                            formDestinatario.setData(
                                                "email",
                                                e.target.value
                                            )
                                        }
                                        type="text"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={formDestinatario.errors.email}
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
                                {formDestinatario.data.id === 0
                                    ? "Guardar nuevo destinatario"
                                    : "Actualizar destinatario"}
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>
            </Fragment>
        </AppLayout>
    );
}
