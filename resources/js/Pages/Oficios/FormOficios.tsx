import AppLayout from "../../Layouts/app";
import { useForm } from "@inertiajs/react";
import { FormEventHandler, useState, Fragment, useRef, useEffect } from "react";
import {
    Card,
    Form,
    Row,
    Col,
    Button,
    Alert,
    ProgressBar,
} from "react-bootstrap";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import "filepond/dist/filepond.min.css";
import Select, { SelectInstance } from "react-select";
import InputError from "../InputError";
import VerPdf from "@/types/VerPdf";
import { Head } from "@inertiajs/react";
import Swal from "sweetalert2";
import TituloCard from "@/types/TituloCard";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";
import toast from "react-hot-toast";
registerPlugin(FilePondPluginFilePoster, FilePondPluginImagePreview);

type FormIn = {
    id: number | null;
    ingreso: string;
    num_oficio: string | "";
    num_folio: string | "";
    dep_ua: string;
    area: string;
    proceso_impacta: string;
    archivo: File | null;
    descripcion: string | "";
};

export default function FormOficio({
    status,
    des,
    areas,
    oficioInicial,
    files,
}: {
    status?: string;
    des: any;
    areas: any;
    oficioInicial: any;
    files: [];
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectDep = useRef<SelectInstance>(null);
    const selectAr = useRef<SelectInstance>(null);
    const selectPro = useRef<SelectInstance>(null);
    const [procesosSelect, setProcesosSelect] = useState([]);
    const [show, setShow] = useState<boolean>(false);
    const [oficio, setOficio] = useState<any>(oficioInicial || {});
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
    const [variables, setVariables] = useState({
        destinatarioDos: false,
        urlPdf: "",
        extension: "",
    });
    const [showDos, setShowDos] = useState(false);

    useEffect(() => {
        setOficio(oficioInicial || {});
        setData({
            id: oficioInicial?.id,
            ingreso: oficioInicial?.ingreso,
            num_oficio: oficioInicial?.num_oficio || "",
            num_folio: oficioInicial?.num_folio || "",
            dep_ua: oficioInicial?.dep_ua,
            area: oficioInicial?.id_area,
            proceso_impacta: "",
            archivo: null,
            descripcion: oficioInicial?.descripcion || "",
        });

        if (oficioInicial?.id !== undefined) {
            selectDep.current!.selectOption({
                value: oficioInicial.dep_ua,
                label: oficioInicial.des,
            });

            selectAr.current!.selectOption({
                value: oficioInicial.id_area,
                label: oficioInicial.area,
            });

            selectPro.current!.selectOption({
                value: oficioInicial.proceso_impacta,
                label: oficioInicial.proceso,
            });
        }
        if (oficioInicial?.id > 0) {
            setTimeout(() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                });
            }, 400);
        }
    }, [oficioInicial]);

    const {
        data,
        setData,
        errors,
        post,
        progress,
        reset,
        setDefaults,
        cancel,
    } = useForm<FormIn>({
        id: oficio?.id,
        ingreso: oficio?.ingreso,
        num_oficio: oficio?.num_oficio || "",
        num_folio: oficio?.num_folio || "",
        dep_ua: oficio?.dep_ua,
        area: oficio?.id_area,
        proceso_impacta: "",
        archivo: null,
        descripcion: oficio?.descripcion || "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (oficio?.id === undefined) {
            Swal.fire({
                title: "¿Está seguro?",
                text: "Una vez guardado el oficio, este no se podrá eliminar y solo se podrán editar los datos relacionados con el responsable.",
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
                    post(route("saveOficio"), {
                        onSuccess: clearForm,
                    });
                } else {
                    cancel();
                }
            });
        } else {
            post(route("saveOficio"), {
                onSuccess: clearForm,
            });
        }
    };

    const handleChangeS = (e: any) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            setData("archivo", target.files[0]);
        }
    };

    const clearForm = () => {
        if (oficio?.id === undefined) {
            setDefaults({
                ingreso: "",
                num_oficio: "",
                num_folio: "",
                dep_ua: "",
                area: "",
                proceso_impacta: "",
                archivo: null,
                descripcion: "",
            });

            reset();
            setProcesosSelect([]);
            fileInputRef.current!.value = "";
            selectDep.current!.clearValue();
            selectAr.current!.clearValue();
            selectPro.current!.clearValue();
        }
    };

    const getProcesos = async (id: number) => {
        selectPro.current!.clearValue();

        const response = await fetch(route("getProcesosPorArea", { id }), {
            method: "get",
        });

        const datos = await response.json();

        if (datos.code == 200) {
            setProcesosSelect(datos.data);
        }
    };

    useEffect(() => {
        if (oficio?.id !== undefined) {
            selectDep.current!.selectOption({
                value: oficio.dep_ua,
                label: oficio.des,
            });

            selectAr.current!.selectOption({
                value: oficio.id_area,
                label: oficio.area,
            });

            selectPro.current!.selectOption({
                value: oficio.proceso_impacta,
                label: oficio.proceso,
            });
        }
    }, []);

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
            {progress && (
                <ProgressBar
                    variant="info-gradient"
                    className="mb-3 progress-xs"
                    now={progress.percentage}
                />
            )}
            <Head>
                <title>Recepción de oficio</title>
                <meta
                    name="recepción de oficios"
                    content="Formaluario para la recepción de oficios"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Recepción de oficio"
                    active="Recepción de oficio"
                    items={[
                        {
                            titulo: "Listado de oficios",
                            urlHeader: "/oficios/listado-oficio",
                        },
                    ]}
                />
                <Row>
                    <Col lg={12} md={12}>
                        <Card>
                            <Card.Header>
                                <Card.Title as="h3">
                                    <TituloCard
                                        titulo="Información de ingreso"
                                        obligatorio={true}
                                    />
                                </Card.Title>
                            </Card.Header>
                            <Card.Body>
                                {status && (
                                    <Alert
                                        variant="success"
                                        className="alert-dismissible"
                                    >
                                        {status}
                                    </Alert>
                                )}
                                <form onSubmit={submit}>
                                    <div className="form-row">
                                        <Col xl={4} md={6} className="mb-4">
                                            <Form.Group>
                                                <Form.Label>
                                                    Ingreso de la solicitud{" "}
                                                    <p className="obligatorio">
                                                        *
                                                    </p>
                                                </Form.Label>
                                                <div className="custom-controls-stacked">
                                                    <label className="custom-control custom-radio-md">
                                                        <input
                                                            type="radio"
                                                            className="custom-control-input"
                                                            name="ingreso"
                                                            defaultValue="Físico"
                                                            disabled={
                                                                oficio?.id ===
                                                                undefined
                                                                    ? false
                                                                    : true
                                                            }
                                                            checked={
                                                                data.ingreso ==
                                                                "Físico"
                                                                    ? true
                                                                    : false
                                                            }
                                                            onChange={() => {
                                                                setData(
                                                                    "ingreso",
                                                                    "Físico"
                                                                );
                                                            }}
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
                                                            disabled={
                                                                oficio?.id ===
                                                                undefined
                                                                    ? false
                                                                    : true
                                                            }
                                                            checked={
                                                                data.ingreso ==
                                                                "Email"
                                                                    ? true
                                                                    : false
                                                            }
                                                            onChange={() => {
                                                                setData(
                                                                    "ingreso",
                                                                    "Email"
                                                                );
                                                            }}
                                                        />
                                                        <span className="custom-control-label">
                                                            Email
                                                        </span>
                                                    </label>
                                                    <InputError
                                                        className="mt-1"
                                                        message={errors.ingreso}
                                                    />
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </div>

                                    <div className="form-row">
                                        {data.ingreso == "Físico" ? (
                                            <Col
                                                xs={12}
                                                sm={6}
                                                xl={4}
                                                className="mb-3"
                                            >
                                                <Form.Label>
                                                    Número de oficio{" "}
                                                    <p className="obligatorio">
                                                        *
                                                    </p>
                                                </Form.Label>
                                                <Form.Control
                                                    name="num_oficio"
                                                    className={
                                                        errors.num_oficio
                                                            ? "inputError"
                                                            : ""
                                                    }
                                                    disabled={
                                                        oficio?.id === undefined
                                                            ? false
                                                            : true
                                                    }
                                                    value={data.num_oficio}
                                                    onChange={(e) =>
                                                        setData(
                                                            "num_oficio",
                                                            e.target.value
                                                        )
                                                    }
                                                    type="text"
                                                />
                                                <InputError
                                                    className="mt-1"
                                                    message={errors.num_oficio}
                                                />
                                            </Col>
                                        ) : null}

                                        {data.ingreso == "Email" ? (
                                            <Col
                                                xs={12}
                                                sm={6}
                                                xl={4}
                                                className="mb-3"
                                            >
                                                <Form.Label>
                                                    Número de folio{" "}
                                                    <p className="obligatorio">
                                                        *
                                                    </p>
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="num_folio"
                                                    className={
                                                        errors.num_folio
                                                            ? "inputError"
                                                            : ""
                                                    }
                                                    disabled={
                                                        oficio?.id === undefined
                                                            ? false
                                                            : true
                                                    }
                                                    value={data.num_folio}
                                                    onChange={(e) =>
                                                        setData(
                                                            "num_folio",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <InputError
                                                    className="mt-1"
                                                    message={errors.num_folio}
                                                />
                                            </Col>
                                        ) : null}

                                        <Col
                                            xs={12}
                                            sm={6}
                                            md={6}
                                            lg={6}
                                            xl={4}
                                            className="mb-3"
                                        >
                                            <Form.Label>
                                                Dependencia o Unidad Académica{" "}
                                                <p className="obligatorio">*</p>
                                            </Form.Label>
                                            <Select
                                                classNamePrefix="Select"
                                                ref={selectDep}
                                                className={
                                                    errors.dep_ua
                                                        ? "inputError"
                                                        : ""
                                                }
                                                options={des}
                                                name="dep_ua"
                                                onChange={(e: any) => {
                                                    setData("dep_ua", e?.value);
                                                }}
                                                placeholder="Seleccione una opción"
                                            />
                                            <InputError
                                                className="mt-1"
                                                message={errors.dep_ua}
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
                                                Área para dar respuesta{" "}
                                                <p className="obligatorio">*</p>
                                            </Form.Label>
                                            <Select
                                                classNamePrefix="Select"
                                                ref={selectAr}
                                                className={
                                                    errors.area
                                                        ? "inputError"
                                                        : ""
                                                }
                                                name="area"
                                                options={areas}
                                                defaultValue={data.area}
                                                onChange={(e: any) => {
                                                    getProcesos(e?.value),
                                                        setData(
                                                            "area",
                                                            e?.value
                                                        );
                                                }}
                                                placeholder="Seleccione una opción"
                                            />
                                            <InputError
                                                className="mt-1"
                                                message={errors.area}
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
                                                Proceso al que impacta{" "}
                                                {data.area == "1" ? null : (
                                                    <p className="obligatorio">
                                                        *
                                                    </p>
                                                )}
                                            </Form.Label>
                                            <Select
                                                classNamePrefix="Select"
                                                options={procesosSelect}
                                                ref={selectPro}
                                                name="proceso_impacta"
                                                className={
                                                    errors.proceso_impacta
                                                        ? "inputError"
                                                        : ""
                                                }
                                                defaultValue={
                                                    data.proceso_impacta
                                                }
                                                onChange={(e: any) =>
                                                    setData(
                                                        "proceso_impacta",
                                                        e?.value
                                                    )
                                                }
                                                placeholder="Seleccione una opción"
                                            />
                                            <InputError
                                                className="mt-1"
                                                message={errors.proceso_impacta}
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
                                                Adjuntar archivo PDF{" "}
                                                <p className="obligatorio">*</p>
                                            </Form.Label>
                                            <Form.Control
                                                type="file"
                                                accept=".pdf"
                                                className={
                                                    errors.archivo
                                                        ? "inputError"
                                                        : ""
                                                }
                                                ref={fileInputRef}
                                                onChange={(e) =>
                                                    handleChangeS(e)
                                                }
                                            />

                                            <InputError
                                                className="mt-1"
                                                message={errors.archivo}
                                            />
                                        </Col>
                                        {oficio?.archivo !== undefined ? (
                                            <Col
                                                xs={12}
                                                sm={6}
                                                xl={4}
                                                style={{ padding: 40 }}
                                            >
                                                <span
                                                    className="tag tag-radius tag-round tag-outline-danger"
                                                    onClick={() =>
                                                        setShow(true)
                                                    }
                                                >
                                                    Click para ver archivo
                                                    <i
                                                        className="fa fa-file-pdf-o"
                                                        style={{ padding: 6 }}
                                                    ></i>
                                                </span>
                                            </Col>
                                        ) : null}
                                    </div>
                                    <div className="form-row">
                                        <Form.Label>
                                            Breve descripción del asunto:{" "}
                                            <p className="obligatorio">*</p>
                                        </Form.Label>
                                        <textarea
                                            className={
                                                errors.descripcion
                                                    ? "form-control inputError"
                                                    : "form-control"
                                            }
                                            name="descripcion"
                                            value={data.descripcion}
                                            onChange={(e) =>
                                                setData(
                                                    "descripcion",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Máximo 1000 caracteres"
                                            rows={2}
                                        >
                                            {data.descripcion}
                                        </textarea>
                                        <InputError
                                            className="mt-1"
                                            message={errors.descripcion}
                                        />
                                    </div>

                                    <Col
                                        xs={12}
                                        className="d-flex justify-content-end mt-5"
                                    >
                                        <Button type="submit" className="mt-4">
                                            {oficio?.id > 0
                                                ? "Actualizar oficio"
                                                : "Guardar nuevo oficio"}
                                        </Button>
                                    </Col>
                                    <Col xs={12} className="mt-2"></Col>
                                    {oficio?.id > 0 ? (
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
                                                    onupdatefiles={
                                                        setFilesState
                                                    }
                                                    allowMultiple={true}
                                                    acceptedFileTypes={[
                                                        "application/pdf",
                                                        "image/jpeg",
                                                        "application/xml",
                                                        "text/xml",
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
                                                        if (url) {
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
                                                                setVariables({
                                                                    ...variables,
                                                                    urlPdf: url,
                                                                    extension:
                                                                        extension,
                                                                });
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
                                                    filePosterMaxHeight={150}
                                                    server={{
                                                        process: {
                                                            url: route(
                                                                "oficios.uploadFilesRecepcion",
                                                                {
                                                                    id: oficio.id,
                                                                }
                                                            ),
                                                            method: "POST",
                                                            withCredentials:
                                                                true,
                                                            headers: {
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
                                                                ).id;
                                                            },
                                                            onerror: (
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
                                                                "oficios.deleteFileRecepcion"
                                                            ),
                                                            method: "DELETE",
                                                            withCredentials:
                                                                true,
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
                                                            onerror: (
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
                                                                    "oficios.deleteFileRecepcion"
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
                                                                    (err) => {
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
                                                            fileItem.origin ===
                                                                1 &&
                                                            fileItem.getMetadata(
                                                                "url"
                                                            )
                                                        ) {
                                                            setTimeout(() => {
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
                                                            }, 100);
                                                        }
                                                    }}
                                                />
                                            </Col>
                                        </Row>
                                    ) : null}
                                </form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <VerPdf
                    urlPdf={oficio?.archivo}
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
