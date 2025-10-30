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
    oficio,
    procesos,
}: {
    status?: string;
    des: any;
    areas: any;
    oficio: any;
    procesos: any;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectDep = useRef<SelectInstance>(null);
    const selectAr = useRef<SelectInstance>(null);
    const selectPro = useRef<SelectInstance>(null);
    const [procesosSelect, setProcesosSelect] = useState([]);
    const [show, setShow] = useState<boolean>(false);

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
                                        ) : (
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
                                                    <p className="obligatorio">
                                                        *
                                                    </p>
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
                                        )}
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
                                    <Col xs={12}>
                                        <Button type="submit" className="mt-4">
                                            Guardar nuevo oficio
                                        </Button>
                                    </Col>
                                    <Col xs={12} className="mt-2"></Col>
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
            </Fragment>
        </AppLayout>
    );
}
