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
import DataTablesCore from "datatables.net-bs5";
import Responsive from "datatables.net-responsive-bs5";

import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import "datatables.net-responsive-bs5/css/responsive.bootstrap5.min.css";

// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import InputError from "../InputError";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import "../../../css/botones.css";

DataTable.use(DataTablesCore);
DataTable.use(Responsive);

// --- Base de opciones para TODAS las tablas ---
const baseDtOptions = {
    language,
    responsive: false, // <- desactivado
    scrollX: true, // <- scroll horizontal
    scrollCollapse: true,
    autoWidth: false,
    columnDefs: [
        { targets: "_all", className: "dt-vmiddle" }, // centra verticalmente
    ],
};

const tableClass =
    "table table-hover align-middle w-100 table-bordered border-bottom";

export default function DestinatariosExternos({
    destinatarios,
}: {
    destinatarios: [];
}) {
    const [show, setShow] = useState(false);
    const [activos, setActivos] = useState<any[]>();
    const [inactivos, setInactivos] = useState<any[]>();
    const [activeTab, setActiveTab] = useState<string>("tab1");

    const formDestinatario = useForm({
        id: 0,
        nombre: "",
        cargo: "",
        dependencia: "",
        email: "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const isCreate = formDestinatario.data.id === 0;

        formDestinatario.post(route("catalogos.saveDestinatario"), {
            preserveScroll: true,
            onSuccess: () => {
                toast(
                    isCreate
                        ? "Correcto: Destinatario externo creado."
                        : "Correcto: Destinatario externo actualizado.",
                    {
                        style: {
                            padding: "25px",
                            color: "#fff",
                            backgroundColor: "#29bf74",
                        },
                        position: "top-center",
                    }
                );
                successDestinatario(); // limpia y cierra modal
            },
            onError: () => {
                toast("Revisa los campos obligatorios.", {
                    style: {
                        padding: "25px",
                        color: "#fff",
                        backgroundColor: "#e02424",
                    },
                    position: "top-center",
                });
            },
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
                    onSuccess: () => {
                        toast("Correcto: Se eliminó el destinatario externo.", {
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

    const onTabSelect = (k: string | null) => {
        setActiveTab(k || "tab1");
        // Recalcula tamaños/columnas cuando la pestaña cambia de oculta a visible
        setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
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
                                    <Tabs
                                        defaultActiveKey="tab1"
                                        onSelect={onTabSelect}
                                    >
                                        <Tab eventKey="tab1" title="Activos">
                                            <Col
                                                md={12}
                                                className="d-flex justify-content-center mb-3"
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
                                                    className={tableClass}
                                                    options={{
                                                        language,
                                                        responsive: {
                                                            details: {
                                                                type: "inline",
                                                            },
                                                        },
                                                        autoWidth: false,
                                                        order: [],
                                                        columnDefs: [
                                                            {
                                                                responsivePriority: 1,
                                                                targets: 0,
                                                            }, // Nombre
                                                            {
                                                                responsivePriority: 2,
                                                                targets: 3,
                                                            }, // Email
                                                            {
                                                                responsivePriority: 10001,
                                                                targets: 2,
                                                            }, // Dependencia se oculta antes
                                                        ],
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "nombre",
                                                            title: "Nombre",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "cargo",
                                                            title: "Cargo",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "dependencia",
                                                            title: "Dependencia",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "email",
                                                            title: "Correo electrónico",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: null,
                                                            title: "Acciones",
                                                            orderable: false,
                                                            searchable: false,
                                                            defaultContent: "",
                                                            className:
                                                                "text-center dt-acciones px-2",
                                                        },
                                                    ]}
                                                    slots={{
                                                        4: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div className="btns-acciones w-100">
                                                                <Button
                                                                    size="sm"
                                                                    className="btn-icon"
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
                                                                    size="sm"
                                                                    className="btn-icon"
                                                                    variant="danger"
                                                                    onClick={() =>
                                                                        delCopia(
                                                                            row.id
                                                                        )
                                                                    }
                                                                    title="Eliminar destinatario externo"
                                                                >
                                                                    <i className="fa fa-trash"></i>
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                />
                                            </Col>
                                        </Tab>

                                        <Tab eventKey="tab2" title="Inactivos">
                                            <Col md={12}>
                                                <DataTable
                                                    data={inactivos}
                                                    className={tableClass}
                                                    options={{
                                                        language,
                                                        responsive: {
                                                            details: {
                                                                type: "inline",
                                                            },
                                                        },
                                                        autoWidth: false,
                                                        order: [],
                                                        columnDefs: [
                                                            {
                                                                responsivePriority: 1,
                                                                targets: 0,
                                                            }, // Nombre
                                                            {
                                                                responsivePriority: 2,
                                                                targets: 3,
                                                            }, // Email
                                                            {
                                                                responsivePriority: 10001,
                                                                targets: 2,
                                                            }, // Dependencia se oculta antes
                                                        ],
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "nombre",
                                                            title: "Nombre",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "cargo",
                                                            title: "Cargo",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "dependencia",
                                                            title: "Dependencia",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "email",
                                                            title: "Correo electrónico",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: null,
                                                            title: "Acciones",
                                                            orderable: false,
                                                            searchable: false,
                                                            defaultContent: "",
                                                            className:
                                                                "text-center dt-acciones px-2",
                                                        },
                                                    ]}
                                                    slots={{
                                                        4: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div className="btns-acciones w-100">
                                                                <Button
                                                                    size="sm"
                                                                    className="btn-icon"
                                                                    variant="success"
                                                                    title="Activar destinatario externo"
                                                                    onClick={() =>
                                                                        reactivateDestinatario(
                                                                            row.id
                                                                        )
                                                                    }
                                                                >
                                                                    <i className="fa fa-repeat"></i>
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                />
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
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={formDestinatario.processing}
                            >
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
