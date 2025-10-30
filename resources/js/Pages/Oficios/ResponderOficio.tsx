import AppLayout from "../../Layouts/app";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { FormEventHandler, Fragment, useEffect, useRef, useState } from "react";
import { Card, Row, Col, Form } from "react-bootstrap";
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
import { sunEditorLangEs } from "../../types/url";
import Swal from "sweetalert2";
import VerPdf from "@/types/VerPdf";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";
registerPlugin(FilePondPluginFilePoster, FilePondPluginImagePreview);

export default function Recepcion({
    status,
    error,
    oficio,
    directorio,
    copy,
    respuesta,
    externos,
    directorioAll,
    files,
}: {
    status?: string;
    error?: string;
    oficio: any;
    directorio: [];
    copy: Copia[];
    respuesta: Respuesta;
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

    useEffect(() => {
        if (
            respuesta?.id_directorio !== undefined &&
            respuesta?.id_directorio !== null
        ) {
            if (respuesta.tipo_destinatario === "Externo") {
                setDestinatarios(externos);
            } else {
                setDestinatarios(directorioAll);
            }

            selectDirec.current!.selectOption({
                value: respuesta.id_directorio,
                label: respuesta.nombre,
            });
        }
    }, []);

    useEffect(() => {
        setCopias(copy);
    }, [copy]);

    useEffect(() => {
        if (error) {
            toast("Error: " + error, {
                style: {
                    padding: "25px",
                    color: "#fff",
                    backgroundColor: "#ff5b51",
                },
                position: "top-center",
            });
        }
    }, [error]);

    const htmlWithTableImages = `<div>Por este medio le envío un cordial saludo, asimismo solicito de su apoyo</div>`;

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
        id_oficio: oficio.id,
        destinatarioDos: respuesta?.tipo_destinatario,
        nombreDos: respuesta?.nombre,
        cargoDos: respuesta?.cargo,
        dependenciaDos: respuesta?.dependencia,
        dirigido_aDos: respuesta?.id_directorio,
        asunto: respuesta?.respuesta || htmlWithTableImages,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route("saveRespuesta"), {
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
                router.put(route("respondeOFicio", { id: oficio.id }));
            }
        });
    };

    const changeExterno = (tipo: string) => {
        setVariables({
            ...variables,
            destinatarioDos: false,
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

    return (
        <AppLayout>
            <Head>
                <title>Responder oficio</title>
                <meta
                    name="Responder oficio"
                    content="Modulo para dar respuesta al oficio asignado"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Responder Oficio"
                    active="Responder Oficio"
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
                                        titulo="Formulario de respuesta"
                                        obligatorio={true}
                                    />
                                </Card.Title>
                                <button
                                    className="btn btn-success mb-3"
                                    onClick={() => setShow(true)}
                                    style={{ margin: "0 !important" }}
                                >
                                    Ver pdf
                                </button>
                            </Card.Header>
                            <Card.Body>
                                <Row>
                                    {oficio.descripcion_rechazo_jefe !==
                                    null ? (
                                        <Col xs={12} className="mb-5">
                                            <Form.Label>
                                                Breve descripción del rechazo
                                                por parte de su jefe de área:
                                            </Form.Label>
                                            <textarea
                                                className="form-control"
                                                value={
                                                    oficio.descripcion_rechazo_jefe
                                                }
                                                rows={3}
                                                disabled
                                            ></textarea>
                                        </Col>
                                    ) : null}

                                    {oficio.descripcion_rechazo_final !==
                                    null ? (
                                        <Col xs={12} className="mb-5">
                                            <Form.Label>
                                                Breve descripción del rechazo
                                                por parte de recepción
                                                documental:
                                            </Form.Label>
                                            <textarea
                                                className="form-control"
                                                value={
                                                    oficio.descripcion_rechazo_final
                                                }
                                                rows={3}
                                                disabled
                                            ></textarea>
                                        </Col>
                                    ) : null}

                                    <Col md={6} xl={4} className="mb-4">
                                        <Form.Group>
                                            <label>
                                                Destinatario{" "}
                                                <p className="obligatorio">*</p>
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
                                                        Interno (BUAP)
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
                                                message={errors.destinatarioDos}
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
                                                    ref={selectDirec}
                                                    options={destinatarios}
                                                    name="dirigido_aDos"
                                                    placeholder="Seleccione una opción"
                                                    onChange={(e: any) =>
                                                        getDirec(e?.value)
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
                                                            e.target.value
                                                        )
                                                    }
                                                    value={data.nombreDos}
                                                    readOnly={true}
                                                />
                                            </div>
                                            <InputError
                                                className="mt-1"
                                                message={errors.nombreDos}
                                            />
                                        </Col>

                                        <Col xs={12} sm={6} xl={4}>
                                            <div className="form-group">
                                                <label htmlFor="">Cargo</label>
                                                <input
                                                    type="text"
                                                    name="cargoDos"
                                                    className="form-control"
                                                    onChange={(e) =>
                                                        setData(
                                                            "cargoDos",
                                                            e.target.value
                                                        )
                                                    }
                                                    value={data.cargoDos}
                                                    readOnly={true}
                                                />
                                            </div>
                                            <InputError
                                                className="mt-1"
                                                message={errors.cargoDos}
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
                                                            e.target.value
                                                        )
                                                    }
                                                    value={data.dependenciaDos}
                                                    readOnly={true}
                                                />
                                            </div>
                                            <InputError
                                                className="mt-1"
                                                message={errors.dependenciaDos}
                                            />
                                        </Col>
                                    </Row>

                                    <Row className="mt-5">
                                        <Col xs={12}>
                                            <h4>
                                                Ingrese aquí el cuerpo de la
                                                respuesta del oficio
                                            </h4>
                                        </Col>
                                        <Col xs={12}>
                                            <SunEditor
                                                setContents={data.asunto}
                                                onChange={(value) => {
                                                    setData("asunto", value);
                                                }}
                                                setDefaultStyle="font-family: 'SourceSansPro'; font-size: 12px;"
                                                setOptions={{
                                                    lang: sunEditorLangEs,
                                                    buttonList: [
                                                        ["undo", "redo"],
                                                        ["font", "fontSize"],
                                                        ["blockquote"],
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
                                                        ["outdent", "indent"],
                                                        [
                                                            "table",
                                                            "horizontalRule",
                                                        ],
                                                    ],
                                                    font: ["SourceSansPro"],
                                                    fontSize: [12],
                                                    defaultTag: "div",
                                                    minHeight: "300px",
                                                    showPathLabel: false,
                                                    attributesWhitelist: {
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
                                                message={errors.asunto}
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
                                                Guardar Respuesta
                                            </button>
                                        </Col>
                                    </Row>

                                    <Row>
                                        <Col xs={12} className="mt-5 mb-4">
                                            <Card.Header className="d-flex justify-content-between">
                                                <Card.Title as="h3">
                                                    <TituloCard
                                                        titulo="Archivos adjuntos"
                                                        obligatorio={false}
                                                    />
                                                </Card.Title>
                                            </Card.Header>
                                        </Col>
                                        <Col>
                                            <FilePond
                                                files={filesState}
                                                onupdatefiles={setFilesState}
                                                allowMultiple={true}
                                                acceptedFileTypes={[
                                                    "application/pdf",
                                                    "image/jpeg",
                                                    "image/png",
                                                    "application/msword",
                                                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                                ]}
                                                onactivatefile={(fileItem) => {
                                                    const url =
                                                        fileItem.getMetadata(
                                                            "url"
                                                        );
                                                    const extension =
                                                        fileItem.getMetadata(
                                                            "extension"
                                                        );
                                                    if (url) {
                                                        if (
                                                            extension ==
                                                                "pdf" ||
                                                            extension ==
                                                                "jpg" ||
                                                            extension ==
                                                                "jpeg" ||
                                                            extension == "png"
                                                        ) {
                                                            setVariables({
                                                                ...variables,
                                                                urlPdf: url,
                                                                extension:
                                                                    extension,
                                                            });
                                                            setShowDos(true);
                                                        } else {
                                                            window.open(
                                                                url,
                                                                "_blank"
                                                            );
                                                        }
                                                    }
                                                }}
                                                filePosterMaxHeight={150}
                                                server={{
                                                    process: {
                                                        url: route(
                                                            "uploadFilesOficio",
                                                            {
                                                                id: oficio.id,
                                                            }
                                                        ),
                                                        method: "POST",
                                                        withCredentials: true,
                                                        headers: {
                                                            "X-XSRF-TOKEN":
                                                                getCookie(
                                                                    "XSRF-TOKEN"
                                                                ),
                                                            Accept: "application/json",
                                                        },
                                                        onload: (response) => {
                                                            return JSON.parse(
                                                                response
                                                            ).id;
                                                        },
                                                        onerror: (response) => {
                                                            let msg =
                                                                "Error al subir archivo";
                                                            try {
                                                                const res =
                                                                    JSON.parse(
                                                                        response
                                                                    );
                                                                if (
                                                                    res.errors &&
                                                                    res.errors
                                                                        .file &&
                                                                    res.errors
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
                                                            toast.error(msg);
                                                            return msg;
                                                        },
                                                    },
                                                    revert: {
                                                        url: route(
                                                            "deleteFileOficio"
                                                        ),
                                                        method: "DELETE",
                                                        withCredentials: true,
                                                        headers: {
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
                                                        onerror: (response) => {
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
                                                            toast.error(msg);
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
                                                                "deleteFileOficio"
                                                            ),
                                                            {
                                                                method: "DELETE",
                                                                credentials:
                                                                    "include",
                                                                headers: {
                                                                    "X-XSRF-TOKEN":
                                                                        getCookie(
                                                                            "XSRF-TOKEN"
                                                                        ),
                                                                },
                                                                body: source,
                                                            }
                                                        )
                                                            .then(
                                                                (response) => {
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
                                                            .catch((err) => {
                                                                toast.error(
                                                                    "Error al eliminar archivo"
                                                                );
                                                                error(
                                                                    "Error al eliminar archivo"
                                                                );
                                                            });
                                                    },
                                                    load: (
                                                        source,
                                                        load,
                                                        error,
                                                        progress,
                                                        abort,
                                                        headers
                                                    ) => {
                                                        load(new Blob());
                                                    },
                                                }}
                                                name="file"
                                                labelIdle='Arrastre y suelte sus archivos o <span class="filepond--label-action">Seleccionelos aquí</span>'
                                                onaddfile={(
                                                    error,
                                                    fileItem
                                                ) => {
                                                    if (
                                                        fileItem.origin === 1 &&
                                                        fileItem.getMetadata(
                                                            "url"
                                                        )
                                                    ) {
                                                        setTimeout(() => {
                                                            const filePondItem =
                                                                document.querySelector(
                                                                    `[data-filepond-item-id="${fileItem.id}"] .filepond--file-info-main`
                                                                );
                                                            if (filePondItem) {
                                                                const url =
                                                                    fileItem.getMetadata(
                                                                        "url"
                                                                    );
                                                                filePondItem.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${fileItem.filename}</a>`;
                                                            }
                                                        }, 100);
                                                    }
                                                }}
                                            />
                                        </Col>
                                    </Row>

                                    <Copias
                                        id={oficio.id}
                                        directorio={directorio}
                                        externos={externos}
                                        copias={copias}
                                        tipo={1}
                                    />

                                    <Row className="mt-5">
                                        <Col sm={12} md={3}></Col>
                                        <Col
                                            sm={12}
                                            md={6}
                                            className="d-flex justify-content-center"
                                        >
                                            <button
                                                className="btn btn-primary"
                                                onClick={enviaRespuesta}
                                                style={{ marginRight: 30 }}
                                            >
                                                Enviar Respuesta
                                            </button>

                                            <button
                                                className="btn btn-success"
                                                onClick={() => setShow(true)}
                                            >
                                                Ver vista previa
                                            </button>
                                        </Col>
                                        <Col sm={12} md={3}></Col>
                                    </Row>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <VerPdf
                    urlPdf={`imprime/pdf/0/${oficio.id}`}
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
