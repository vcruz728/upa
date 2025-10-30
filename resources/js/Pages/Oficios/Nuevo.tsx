import AppLayout from "../../Layouts/app";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { FormEventHandler, Fragment, useEffect, useRef, useState } from "react";
import { Card, Row, Col, Form, Tabs, Tab, Button } from "react-bootstrap";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import TituloCard from "@/types/TituloCard";
import { SelectInstance } from "react-select";
import Select from "react-select";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";
import Copias from "./Copias";
import { Copia, Respuesta } from "./Interfaces/Copia";
import toast from "react-hot-toast";
import InputError from "../InputError";
import { getFullUrl, sunEditorLangEs } from "../../types/url";
import Swal from "sweetalert2";
import VerPdf from "@/types/VerPdf";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";
registerPlugin(FilePondPluginFilePoster, FilePondPluginImagePreview);

type FormIn = {
    id: number;
    descripcion: string;
    archivo: File | null;
};

export default function Nuevo({
    status,
    error,
    oficio,
    directorio,
    copy,
    directorioAll,
    externos,
    files,
}: {
    status?: string;
    error?: string;
    oficio: any;
    directorio: [];
    copy: Copia[];
    directorioAll: [];
    externos: [];
    files: [];
}) {
    const selectDirec = useRef<SelectInstance>(null);
    const [copias, setCopias] = useState<Copia[]>(copy);
    const [variables, setVariables] = useState({
        destinatarioDos: false,
        urlPdf: "",
        extension: "",
    });
    const [show, setShow] = useState(false);
    const [filesState, setFilesState] = useState<any[]>(
        (files || []).map((file: any) => ({
            ...file,
            file: file.file || file.options?.metadata?.url,
            source: String(file.source),
            options: {
                ...file.options,
                type: "local",
            },
            origin: 1,
        }))
    );
    const [destinatarios, setDestinatarios] = useState<any[]>([]);
    const [showDos, setShowDos] = useState(false);
    const htmlInicial = `<div>Por este medio le envío un cordial saludo, asimismo solicito de su apoyo</div>`;

    useEffect(() => {
        if (
            oficio?.id_directorio !== undefined &&
            oficio?.id_directorio !== null
        ) {
            if (oficio.tipo_destinatario === "Externo") {
                setDestinatarios(externos);
            } else {
                setDestinatarios(directorioAll);
            }

            selectDirec.current!.selectOption({
                value: oficio.id_directorio,
                label: oficio.nombre,
            });
        }
    }, []);

    useEffect(() => {
        setData("id_oficio", oficio?.id || 0);
        formGrupal.setData("id", oficio?.id || 0);
    }, [oficio]);

    useEffect(() => {
        setCopias(copy);
    }, [copy]);

    useEffect(() => {
        if (error) {
            const errorMessage = error.includes("|")
                ? error.split("|")[0]
                : error;
            toast("Error: " + errorMessage, {
                style: {
                    padding: "25px",
                    color: "#fff",
                    backgroundColor: "#ff5b51",
                },
                position: "top-center",
            });
        }
    }, [error]);

    const {
        data,
        setData,
        errors,
        post,
        progress,
        reset,
        setDefaults,
        cancel,
    } = useForm({
        id_oficio: oficio?.id || 0,
        destinatarioDos: oficio?.tipo_destinatario,
        nombreDos: oficio?.nombre,
        cargoDos: oficio?.cargo,
        dependenciaDos: oficio?.dependencia,
        dirigido_aDos: oficio?.id_directorio,
        asunto: oficio?.respuesta || htmlInicial,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route("saveNuevoOficio"), {
            preserveScroll: true,
            onSuccess: () =>
                toast("Correcto: Se guardo la respuesta del oficio.", {
                    style: {
                        padding: "25px",
                        color: "#fff",
                        backgroundColor: "#29bf74",
                    },
                    position: "top-center",
                }),
        });
    };

    const getDirec = async (value: number) => {
        if (value === undefined || value === null) {
            return;
        }
        setData("dirigido_aDos", value);
        const response = await fetch(
            route("getDetalleDirectorio", {
                id: value,
                tipo: data.destinatarioDos,
            }),
            {
                method: "get",
            }
        );

        const datos = await response.json();

        if (datos.code == 200) {
            setData("nombreDos", datos.data.nombre);
            setData("cargoDos", datos.data.cargo);
            setData("dependenciaDos", datos.data.dependencia);
        } else {
            toast("Error: Intente de nuevo.", {
                style: {
                    padding: "25px",
                    color: "#fff",
                    backgroundColor: "#ff5b51",
                },
                position: "top-center",
            });
        }
    };

    const enviaRespuesta = () => {
        Swal.fire({
            title: "¿Está seguro?",
            text: "Una vez guardada la respuesta, esta se enviará y no se podrá editar",
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
                    route("enviaOficioNuevo", {
                        id: data.id_oficio,
                    })
                );
            }
        });
    };

    const changeExterno = (tipo: string) => {
        setVariables({
            ...variables,
            destinatarioDos: tipo == "Externo" ? false : true,
        });
        setData("destinatarioDos", tipo);
        selectDirec.current!.clearValue();

        if (tipo === "Externo") {
            setDestinatarios(externos);
        } else {
            setDestinatarios(directorioAll);
        }

        setData("nombreDos", "");
        setData("cargoDos", "");
        setData("dependenciaDos", "");
    };

    function getCookie(name: string): string {
        let value = "; " + document.cookie;
        let parts = value.split("; " + name + "=");
        if (parts.length === 2)
            // @ts-ignore
            return decodeURIComponent(parts.pop().split(";").shift());
        return "";
    }

    const nuevoGrupal = () => {
        Swal.fire({
            title: "¿Está seguro?",
            text: "Se le asignara un folio de oficio el cual tendra que usar para el oficio grupal",
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
                router.post(route(`nuevo.oficio.grupal`));
            }
        });
    };

    const formGrupal = useForm<FormIn>({
        id: oficio?.id,
        archivo: null,
        descripcion: oficio?.descripcion || "",
    });

    const submitGrupal: FormEventHandler = (e) => {
        e.preventDefault();
        console.log(formGrupal.data);
        formGrupal.post(route("saveNuevoOficioGrupal"), {});
    };

    const handleChangeS = (e: any) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            formGrupal.setData("archivo", target.files[0]);
        }
    };

    return (
        <AppLayout>
            <Head>
                <title>Nuevo oficio</title>
                <meta
                    name="Nuevo oficio"
                    content="Modulo para dar respuesta al oficio asignado"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Nuevo Oficio"
                    active="Nuevo Oficio"
                    items={[
                        {
                            titulo: "Mis oficios",
                            urlHeader: "/oficios/mis-oficios",
                        },
                    ]}
                />
                <Row>
                    <Col md={12}>
                        <Card>
                            <Card.Header className="d-flex justify-content-between">
                                <Card.Title as="h3">
                                    <TituloCard
                                        titulo="Formulario"
                                        obligatorio={true}
                                    />
                                </Card.Title>
                            </Card.Header>
                            <Card.Body>
                                <div className="panel panel-default">
                                    <Tabs
                                        defaultActiveKey={
                                            oficio?.masivo == 1
                                                ? "tab2"
                                                : "tab1"
                                        }
                                    >
                                        <Tab
                                            eventKey="tab1"
                                            title="Individual"
                                            hidden={
                                                oficio?.masivo == 1
                                                    ? true
                                                    : false
                                            }
                                        >
                                            <Row>
                                                <Col
                                                    xs={12}
                                                    className="d-flex justify-content-end mb-3"
                                                >
                                                    <button
                                                        className="btn btn-success mb-3"
                                                        onClick={() =>
                                                            setShow(true)
                                                        }
                                                        style={{
                                                            margin: "0 !important",
                                                        }}
                                                    >
                                                        Ver pdf
                                                    </button>
                                                </Col>
                                                {oficio?.descripcion_rechazo_jefe !==
                                                    undefined &&
                                                oficio?.descripcion_rechazo_jefe !==
                                                    null ? (
                                                    <Col
                                                        xs={12}
                                                        className="mb-5"
                                                    >
                                                        <Form.Label>
                                                            Breve descripción
                                                            del rechazo por
                                                            parte de su jefe de
                                                            área:
                                                        </Form.Label>
                                                        <textarea
                                                            className="form-control"
                                                            value={
                                                                oficio?.descripcion_rechazo_jefe
                                                            }
                                                            rows={3}
                                                            disabled
                                                        ></textarea>
                                                    </Col>
                                                ) : null}

                                                {oficio?.descripcion_rechazo_final !==
                                                    undefined &&
                                                oficio?.descripcion_rechazo_final !==
                                                    null ? (
                                                    <Col
                                                        xs={12}
                                                        className="mb-5"
                                                    >
                                                        <Form.Label>
                                                            Breve descripción
                                                            del rechazo por
                                                            parte de recepción
                                                            documental:
                                                        </Form.Label>
                                                        <textarea
                                                            className="form-control"
                                                            value={
                                                                oficio?.descripcion_rechazo_final
                                                            }
                                                            rows={3}
                                                            disabled
                                                        ></textarea>
                                                    </Col>
                                                ) : null}

                                                <Col
                                                    md={6}
                                                    xl={4}
                                                    className="mb-4"
                                                >
                                                    <Form.Group>
                                                        <label>
                                                            Destinatario{" "}
                                                            <p className="obligatorio">
                                                                *
                                                            </p>
                                                        </label>
                                                        <div className="custom-controls-stacked">
                                                            <label className="custom-control custom-radio-md">
                                                                <input
                                                                    type="radio"
                                                                    className="custom-control-input"
                                                                    name="destinatarioDos"
                                                                    defaultValue="Interno"
                                                                    onChange={() => {
                                                                        changeExterno(
                                                                            "Interno"
                                                                        );
                                                                    }}
                                                                    checked={
                                                                        data.destinatarioDos ==
                                                                        "Interno"
                                                                            ? true
                                                                            : false
                                                                    }
                                                                />
                                                                <span className="custom-control-label">
                                                                    Interno
                                                                    (BUAP)
                                                                </span>
                                                            </label>
                                                            <label
                                                                className="custom-control custom-radio-md"
                                                                style={{
                                                                    marginLeft:
                                                                        "2rem",
                                                                }}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    className="custom-control-input"
                                                                    name="destinatarioDos"
                                                                    defaultValue="Externo"
                                                                    onChange={() => {
                                                                        changeExterno(
                                                                            "Externo"
                                                                        );
                                                                    }}
                                                                    checked={
                                                                        data.destinatarioDos ==
                                                                        "Externo"
                                                                            ? true
                                                                            : false
                                                                    }
                                                                />
                                                                <span className="custom-control-label">
                                                                    Externo
                                                                </span>
                                                            </label>
                                                        </div>
                                                        <InputError
                                                            className="mt-1"
                                                            message={
                                                                errors.destinatarioDos
                                                            }
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                <Row>
                                                    <Col xs={12} sm={6} xl={4}>
                                                        <div className="form-group">
                                                            <label htmlFor="directorio">
                                                                Dirigido a:
                                                                <p className="obligatorio">
                                                                    *
                                                                </p>
                                                            </label>
                                                            <Select
                                                                classNamePrefix="Select"
                                                                ref={
                                                                    selectDirec
                                                                }
                                                                options={
                                                                    destinatarios
                                                                }
                                                                name="dirigido_aDos"
                                                                placeholder="Seleccione una opción"
                                                                onChange={(
                                                                    e: any
                                                                ) =>
                                                                    getDirec(
                                                                        e?.value
                                                                    )
                                                                }
                                                            />
                                                            <InputError
                                                                className="mt-1"
                                                                message={
                                                                    errors.dirigido_aDos
                                                                }
                                                            />
                                                        </div>
                                                    </Col>
                                                </Row>

                                                <Row>
                                                    <Col xs={12} sm={6} xl={4}>
                                                        <div className="form-group">
                                                            <label htmlFor="">
                                                                Nombre
                                                                <p className="obligatorio">
                                                                    *
                                                                </p>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="nombreDos"
                                                                className="form-control"
                                                                onChange={(e) =>
                                                                    setData(
                                                                        "nombreDos",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                value={
                                                                    data.nombreDos
                                                                }
                                                                readOnly={true}
                                                            />
                                                        </div>
                                                        <InputError
                                                            className="mt-1"
                                                            message={
                                                                errors.nombreDos
                                                            }
                                                        />
                                                    </Col>

                                                    <Col xs={12} sm={6} xl={4}>
                                                        <div className="form-group">
                                                            <label htmlFor="">
                                                                Cargo
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="cargoDos"
                                                                className="form-control"
                                                                onChange={(e) =>
                                                                    setData(
                                                                        "cargoDos",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                value={
                                                                    data.cargoDos
                                                                }
                                                                readOnly={true}
                                                            />
                                                        </div>
                                                        <InputError
                                                            className="mt-1"
                                                            message={
                                                                errors.cargoDos
                                                            }
                                                        />
                                                    </Col>

                                                    <Col xs={12} sm={6} xl={4}>
                                                        <div className="form-group">
                                                            <label htmlFor="">
                                                                Dependencia
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="dependenciaDos"
                                                                className="form-control"
                                                                onChange={(e) =>
                                                                    setData(
                                                                        "dependenciaDos",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                value={
                                                                    data.dependenciaDos
                                                                }
                                                                readOnly={true}
                                                            />
                                                        </div>
                                                        <InputError
                                                            className="mt-1"
                                                            message={
                                                                errors.dependenciaDos
                                                            }
                                                        />
                                                    </Col>
                                                </Row>

                                                <Row className="mt-5">
                                                    <Col xs={12}>
                                                        <h4>
                                                            Ingrese aquí el
                                                            cuerpo de la
                                                            respuesta del oficio
                                                        </h4>
                                                    </Col>
                                                    <Col xs={12}>
                                                        <SunEditor
                                                            setContents={
                                                                data.asunto
                                                            }
                                                            onChange={(
                                                                value
                                                            ) => {
                                                                setData(
                                                                    "asunto",
                                                                    value
                                                                );
                                                            }}
                                                            setDefaultStyle="font-family: 'SourceSansPro'; font-size: 12px;"
                                                            setOptions={{
                                                                lang: sunEditorLangEs,
                                                                buttonList: [
                                                                    [
                                                                        "undo",
                                                                        "redo",
                                                                    ],
                                                                    [
                                                                        "font",
                                                                        "fontSize",
                                                                    ],
                                                                    [
                                                                        "blockquote",
                                                                    ],
                                                                    [
                                                                        "bold",
                                                                        "underline",
                                                                        "italic",
                                                                        "strike",
                                                                        "subscript",
                                                                        "superscript",
                                                                    ],
                                                                    [
                                                                        "fontColor",
                                                                        "hiliteColor",
                                                                    ],
                                                                    [
                                                                        "align",
                                                                        "list",
                                                                        "lineHeight",
                                                                    ],
                                                                    [
                                                                        "outdent",
                                                                        "indent",
                                                                    ],
                                                                    [
                                                                        "table",
                                                                        "horizontalRule",
                                                                    ],
                                                                ],
                                                                font: [
                                                                    "SourceSansPro",
                                                                ],
                                                                fontSize: [12],
                                                                defaultTag:
                                                                    "div",
                                                                minHeight:
                                                                    "300px",
                                                                showPathLabel:
                                                                    false,
                                                                attributesWhitelist:
                                                                    {
                                                                        all: "style",
                                                                        table: "cellpadding|width|cellspacing|height|style",
                                                                        tr: "valign|style",
                                                                        td: "styleinsert|height|style",
                                                                        img: "title|alt|src|style",
                                                                    },
                                                            }}
                                                        />
                                                        <InputError
                                                            className="mt-1"
                                                            message={
                                                                errors.asunto
                                                            }
                                                        />
                                                    </Col>

                                                    <Col
                                                        xs={12}
                                                        className="d-flex justify-content-end mt-5"
                                                    >
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={submit}
                                                        >
                                                            Guardar oficio
                                                        </button>
                                                    </Col>
                                                </Row>

                                                {oficio?.id !== undefined ? (
                                                    <>
                                                        <Row>
                                                            <Col
                                                                xs={12}
                                                                className="mt-5 mb-4"
                                                            >
                                                                <Card.Header className="d-flex justify-content-between">
                                                                    <Card.Title as="h3">
                                                                        <TituloCard
                                                                            titulo="Archivos adjuntos"
                                                                            obligatorio={
                                                                                false
                                                                            }
                                                                        />
                                                                    </Card.Title>
                                                                </Card.Header>
                                                            </Col>
                                                            <Col>
                                                                <FilePond
                                                                    files={
                                                                        filesState
                                                                    }
                                                                    onupdatefiles={
                                                                        setFilesState
                                                                    }
                                                                    allowMultiple={
                                                                        true
                                                                    }
                                                                    acceptedFileTypes={[
                                                                        "application/pdf",
                                                                        "image/jpeg",
                                                                        "image/png",
                                                                        "application/msword",
                                                                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                                                    ]}
                                                                    onactivatefile={(
                                                                        fileItem
                                                                    ) => {
                                                                        const url =
                                                                            fileItem.getMetadata(
                                                                                "url"
                                                                            );
                                                                        const extension =
                                                                            fileItem.getMetadata(
                                                                                "extension"
                                                                            );
                                                                        if (
                                                                            url
                                                                        ) {
                                                                            if (
                                                                                extension ==
                                                                                    "pdf" ||
                                                                                extension ==
                                                                                    "jpg" ||
                                                                                extension ==
                                                                                    "jpeg" ||
                                                                                extension ==
                                                                                    "png"
                                                                            ) {
                                                                                setVariables(
                                                                                    {
                                                                                        ...variables,
                                                                                        urlPdf: url,
                                                                                        extension:
                                                                                            extension,
                                                                                    }
                                                                                );
                                                                                setShowDos(
                                                                                    true
                                                                                );
                                                                            } else {
                                                                                window.open(
                                                                                    url,
                                                                                    "_blank"
                                                                                );
                                                                            }
                                                                        }
                                                                    }}
                                                                    filePosterMaxHeight={
                                                                        150
                                                                    }
                                                                    server={{
                                                                        process:
                                                                            {
                                                                                url: route(
                                                                                    "oficios.uploadFilesNew",
                                                                                    {
                                                                                        id: data.id_oficio,
                                                                                    }
                                                                                ),
                                                                                method: "POST",
                                                                                withCredentials:
                                                                                    true,
                                                                                headers:
                                                                                    {
                                                                                        "X-XSRF-TOKEN":
                                                                                            getCookie(
                                                                                                "XSRF-TOKEN"
                                                                                            ),
                                                                                        Accept: "application/json",
                                                                                    },
                                                                                onload: (
                                                                                    response
                                                                                ) => {
                                                                                    return JSON.parse(
                                                                                        response
                                                                                    )
                                                                                        .id;
                                                                                },
                                                                                onerror:
                                                                                    (
                                                                                        response
                                                                                    ) => {
                                                                                        let msg =
                                                                                            "Error al subir archivo";
                                                                                        try {
                                                                                            const res =
                                                                                                JSON.parse(
                                                                                                    response
                                                                                                );

                                                                                            if (
                                                                                                res.errors &&
                                                                                                res
                                                                                                    .errors
                                                                                                    .file &&
                                                                                                res
                                                                                                    .errors
                                                                                                    .file
                                                                                                    .length >
                                                                                                    0
                                                                                            ) {
                                                                                                msg =
                                                                                                    res
                                                                                                        .errors
                                                                                                        .file[0];
                                                                                            } else if (
                                                                                                res.message
                                                                                            ) {
                                                                                                msg =
                                                                                                    res.message;
                                                                                            }
                                                                                        } catch {}
                                                                                        toast.error(
                                                                                            msg
                                                                                        );
                                                                                        return msg;
                                                                                    },
                                                                            },
                                                                        revert: {
                                                                            url: route(
                                                                                "oficio.deleteFile"
                                                                            ),
                                                                            method: "DELETE",
                                                                            withCredentials:
                                                                                true,
                                                                            headers:
                                                                                {
                                                                                    "X-XSRF-TOKEN":
                                                                                        getCookie(
                                                                                            "XSRF-TOKEN"
                                                                                        ),
                                                                                },
                                                                            onload: () => {
                                                                                toast.success(
                                                                                    "Archivo eliminado"
                                                                                );
                                                                                return "";
                                                                            },
                                                                            onerror:
                                                                                (
                                                                                    response
                                                                                ) => {
                                                                                    let msg =
                                                                                        "Error al eliminar archivo";
                                                                                    try {
                                                                                        const res =
                                                                                            JSON.parse(
                                                                                                response
                                                                                            );
                                                                                        msg =
                                                                                            res.error ||
                                                                                            msg;
                                                                                    } catch {}
                                                                                    toast.error(
                                                                                        msg
                                                                                    );
                                                                                    return response;
                                                                                },
                                                                        },
                                                                        remove: (
                                                                            source,
                                                                            load,
                                                                            error
                                                                        ) => {
                                                                            fetch(
                                                                                route(
                                                                                    "oficio.deleteFile"
                                                                                ),
                                                                                {
                                                                                    method: "DELETE",
                                                                                    credentials:
                                                                                        "include",
                                                                                    headers:
                                                                                        {
                                                                                            "X-XSRF-TOKEN":
                                                                                                getCookie(
                                                                                                    "XSRF-TOKEN"
                                                                                                ),
                                                                                        },
                                                                                    body: source,
                                                                                }
                                                                            )
                                                                                .then(
                                                                                    (
                                                                                        response
                                                                                    ) => {
                                                                                        if (
                                                                                            response.ok
                                                                                        ) {
                                                                                            toast.success(
                                                                                                "Archivo eliminado"
                                                                                            );
                                                                                            load();
                                                                                        } else {
                                                                                            return response
                                                                                                .json()
                                                                                                .then(
                                                                                                    (
                                                                                                        data
                                                                                                    ) => {
                                                                                                        const msg =
                                                                                                            data.error ||
                                                                                                            "Error al eliminar archivo";
                                                                                                        toast.error(
                                                                                                            msg
                                                                                                        );
                                                                                                        error(
                                                                                                            msg
                                                                                                        );
                                                                                                    }
                                                                                                );
                                                                                        }
                                                                                    }
                                                                                )
                                                                                .catch(
                                                                                    (
                                                                                        err
                                                                                    ) => {
                                                                                        toast.error(
                                                                                            "Error al eliminar archivo"
                                                                                        );
                                                                                        error(
                                                                                            "Error al eliminar archivo"
                                                                                        );
                                                                                    }
                                                                                );
                                                                        },
                                                                        load: (
                                                                            source,
                                                                            load,
                                                                            error,
                                                                            progress,
                                                                            abort,
                                                                            headers
                                                                        ) => {
                                                                            load(
                                                                                new Blob()
                                                                            );
                                                                        },
                                                                    }}
                                                                    name="file"
                                                                    labelIdle='Arrastre y suelte sus archivos o <span class="filepond--label-action">Seleccionelos aquí</span>'
                                                                    onaddfile={(
                                                                        error,
                                                                        fileItem
                                                                    ) => {
                                                                        if (
                                                                            fileItem.origin ===
                                                                                1 &&
                                                                            fileItem.getMetadata(
                                                                                "url"
                                                                            )
                                                                        ) {
                                                                            setTimeout(
                                                                                () => {
                                                                                    const filePondItem =
                                                                                        document.querySelector(
                                                                                            `[data-filepond-item-id="${fileItem.id}"] .filepond--file-info-main`
                                                                                        );
                                                                                    if (
                                                                                        filePondItem
                                                                                    ) {
                                                                                        const url =
                                                                                            fileItem.getMetadata(
                                                                                                "url"
                                                                                            );
                                                                                        filePondItem.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${fileItem.filename}</a>`;
                                                                                    }
                                                                                },
                                                                                100
                                                                            );
                                                                        }
                                                                    }}
                                                                />
                                                            </Col>
                                                        </Row>

                                                        <Copias
                                                            id={data.id_oficio}
                                                            directorio={
                                                                directorio
                                                            }
                                                            externos={externos}
                                                            copias={copias}
                                                            tipo={0}
                                                        />

                                                        <Row className="mt-5">
                                                            <Col
                                                                sm={12}
                                                                md={3}
                                                            ></Col>
                                                            <Col
                                                                sm={12}
                                                                md={6}
                                                                className="d-flex justify-content-center"
                                                            >
                                                                <button
                                                                    className="btn btn-primary"
                                                                    onClick={
                                                                        enviaRespuesta
                                                                    }
                                                                    style={{
                                                                        marginRight: 30,
                                                                    }}
                                                                >
                                                                    Enviar
                                                                    Respuesta
                                                                </button>

                                                                <button
                                                                    className="btn btn-success"
                                                                    onClick={() =>
                                                                        setShow(
                                                                            true
                                                                        )
                                                                    }
                                                                >
                                                                    Ver vista
                                                                    previa
                                                                </button>
                                                            </Col>
                                                            <Col
                                                                sm={12}
                                                                md={3}
                                                            ></Col>
                                                        </Row>
                                                    </>
                                                ) : null}
                                            </Row>
                                        </Tab>
                                        <Tab
                                            eventKey="tab2"
                                            title="Grupal"
                                            hidden={
                                                oficio?.masivo != 1 &&
                                                oficio?.masivo !== undefined
                                                    ? true
                                                    : false
                                            }
                                        >
                                            <Row>
                                                {oficio?.descripcion_rechazo_jefe !==
                                                    undefined &&
                                                oficio?.descripcion_rechazo_jefe !==
                                                    null ? (
                                                    <Col
                                                        xs={12}
                                                        className="mb-5"
                                                    >
                                                        <Form.Label>
                                                            Breve descripción
                                                            del rechazo por
                                                            parte de su jefe de
                                                            área:
                                                        </Form.Label>
                                                        <textarea
                                                            className="form-control"
                                                            value={
                                                                oficio?.descripcion_rechazo_jefe
                                                            }
                                                            rows={3}
                                                            disabled
                                                        ></textarea>
                                                    </Col>
                                                ) : null}

                                                {oficio?.descripcion_rechazo_final !==
                                                    undefined &&
                                                oficio?.descripcion_rechazo_final !==
                                                    null ? (
                                                    <Col
                                                        xs={12}
                                                        className="mb-5"
                                                    >
                                                        <Form.Label>
                                                            Breve descripción
                                                            del rechazo por
                                                            parte de recepción
                                                            documental:
                                                        </Form.Label>
                                                        <textarea
                                                            className="form-control"
                                                            value={
                                                                oficio?.descripcion_rechazo_final
                                                            }
                                                            rows={3}
                                                            disabled
                                                        ></textarea>
                                                    </Col>
                                                ) : null}

                                                {oficio?.id === undefined ? (
                                                    <Col
                                                        md={12}
                                                        className="d-flex justify-content-center mb-4"
                                                    >
                                                        <Button
                                                            className="btn btn-primary"
                                                            onClick={
                                                                nuevoGrupal
                                                            }
                                                        >
                                                            Obtener Folio
                                                        </Button>
                                                    </Col>
                                                ) : (
                                                    <>
                                                        <Col
                                                            md={12}
                                                            className="d-flex justify-content-center mb-4 mt-4"
                                                        >
                                                            <h3>
                                                                Numero de folio:{" "}
                                                                {
                                                                    oficio.oficio_respuesta
                                                                }
                                                            </h3>
                                                        </Col>
                                                        <form
                                                            onSubmit={
                                                                submitGrupal
                                                            }
                                                        >
                                                            <Col
                                                                xs={12}
                                                                className="mb-5"
                                                            >
                                                                <Form.Label>
                                                                    Breve
                                                                    descripción
                                                                    del motivo
                                                                    del oficio
                                                                </Form.Label>
                                                                <textarea
                                                                    className={
                                                                        formGrupal
                                                                            .errors
                                                                            .descripcion
                                                                            ? "form-control inputError"
                                                                            : "form-control"
                                                                    }
                                                                    defaultValue={
                                                                        formGrupal
                                                                            .data
                                                                            .descripcion
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        formGrupal.setData(
                                                                            "descripcion",
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    rows={3}
                                                                ></textarea>
                                                                <InputError
                                                                    className="mt-1"
                                                                    message={
                                                                        formGrupal
                                                                            .errors
                                                                            .descripcion
                                                                    }
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
                                                                    Adjuntar
                                                                    archivo PDF
                                                                    o Word{" "}
                                                                    <p className="obligatorio">
                                                                        *
                                                                    </p>
                                                                </Form.Label>
                                                                <Form.Control
                                                                    type="file"
                                                                    accept=".pdf,.doc,.docx"
                                                                    className={
                                                                        formGrupal
                                                                            .errors
                                                                            .archivo
                                                                            ? "inputError"
                                                                            : ""
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        handleChangeS(
                                                                            e
                                                                        )
                                                                    }
                                                                />

                                                                <InputError
                                                                    className="mt-1"
                                                                    message={
                                                                        formGrupal
                                                                            .errors
                                                                            .archivo
                                                                    }
                                                                />
                                                            </Col>

                                                            {oficio?.id !==
                                                                undefined &&
                                                            oficio?.archivo !==
                                                                null ? (
                                                                <>
                                                                    {oficio?.archivo.substring(
                                                                        oficio
                                                                            ?.archivo
                                                                            .length -
                                                                            3
                                                                    ) !==
                                                                    "pdf" ? (
                                                                        <Col
                                                                            xs={
                                                                                12
                                                                            }
                                                                            style={{
                                                                                padding: 40,
                                                                            }}
                                                                        >
                                                                            <a
                                                                                className="tag tag-radius tag-round tag-outline-danger"
                                                                                target="_BLANK"
                                                                                href={getFullUrl(
                                                                                    `/files/${oficio.archivo}`
                                                                                )}
                                                                            >
                                                                                Click
                                                                                para
                                                                                descargar
                                                                                el
                                                                                archivo
                                                                                <i
                                                                                    className="fa fa-file-pdf-o"
                                                                                    style={{
                                                                                        padding: 6,
                                                                                    }}
                                                                                ></i>
                                                                            </a>
                                                                        </Col>
                                                                    ) : (
                                                                        <Col
                                                                            xs={
                                                                                12
                                                                            }
                                                                            style={{
                                                                                padding: 40,
                                                                            }}
                                                                        >
                                                                            <span
                                                                                className="tag tag-radius tag-round tag-outline-danger"
                                                                                onClick={() => {
                                                                                    setVariables(
                                                                                        {
                                                                                            ...variables,
                                                                                            urlPdf: oficio?.archivo,
                                                                                            extension:
                                                                                                "pdf",
                                                                                        }
                                                                                    );
                                                                                    setShowDos(
                                                                                        true
                                                                                    );
                                                                                }}
                                                                            >
                                                                                Click
                                                                                para
                                                                                ver
                                                                                archivo
                                                                                <i
                                                                                    className="fa fa-file-pdf-o"
                                                                                    style={{
                                                                                        padding: 6,
                                                                                    }}
                                                                                ></i>
                                                                            </span>
                                                                        </Col>
                                                                    )}
                                                                </>
                                                            ) : null}

                                                            <Col
                                                                xs={12}
                                                                className="mb-3 d-flex justify-content-end"
                                                            >
                                                                <Button
                                                                    className="btn btn-primary mt-4"
                                                                    type="submit"
                                                                >
                                                                    Guardar y
                                                                    enviar a
                                                                    revisión
                                                                </Button>
                                                            </Col>
                                                        </form>
                                                    </>
                                                )}
                                            </Row>
                                        </Tab>
                                    </Tabs>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <VerPdf
                    urlPdf={`imprime/nuevo/pdf/${data.id_oficio}`}
                    show={show}
                    setShow={setShow}
                    tipo="pdf"
                />

                <VerPdf
                    urlPdf={variables.urlPdf}
                    show={showDos}
                    tipo={variables.extension}
                    setShow={setShowDos}
                />
            </Fragment>
        </AppLayout>
    );
}
