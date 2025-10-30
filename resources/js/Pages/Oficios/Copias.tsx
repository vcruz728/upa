import { useForm, router } from "@inertiajs/react";
import { FormEventHandler, useEffect, useRef, useState } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import Select, { SelectInstance } from "react-select";
import InputError from "../InputError";
import { Copia } from "./Interfaces/Copia";
// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import TituloCard from "@/types/TituloCard";

DataTable.use(DT);

const Copias = ({
    id,
    directorio,
    externos,
    copias,
    tipo,
}: {
    id: number;
    directorio: [];
    externos: [];
    copias: Copia[];
    tipo: number;
}) => {
    const selectDirec = useRef<SelectInstance>(null);
    const [variables, setVariables] = useState({
        destinatario: 0,
    });

    useEffect(() => {
        setData("id", id);
    }, [id]);

    const [copiaA, setCopiaA] = useState<any>([]);
    const { data, setData, errors, post, progress, reset, setDefaults } =
        useForm({
            id: id,
            tipo: tipo,
            destinatario: "",
            dirigido_a: "",
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route("saveCopiasOficio"), {
            preserveScroll: true,
            onSuccess: clearForm,
        });
    };

    const clearForm = () => {
        setDefaults({
            id: id,
            destinatario: "",
            dirigido_a: "",
        });

        reset("dirigido_a");
        selectDirec.current!.clearValue();

        toast("Correcto: Se guardo una copia al oficio.", {
            style: {
                padding: "25px",
                color: "#fff",
                backgroundColor: "#29bf74",
            },
            position: "top-center",
        });
    };

    const delCopia = (id: number) => {
        Swal.fire({
            title: "¿Está seguro?",
            text: "La información de la copia se eliminará permanentemente.",
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
                router.delete(route("deleteCopiasOficio", { id }), {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        toast("Correcto: Se elimino la copia del oficio.", {
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

    return (
        <>
            <Row>
                <Col xs={12} className="mt-5">
                    <Card.Header className="d-flex justify-content-between">
                        <Card.Title as="h3">
                            <TituloCard titulo="Copias" obligatorio={true} />
                        </Card.Title>
                    </Card.Header>
                </Col>
                <Col xs={12} sm={6} xl={4} className="mb-4 mt-3">
                    <Form.Group>
                        <label>
                            Tipo de usuario <p className="obligatorio">*</p>
                        </label>
                        <div className="custom-controls-stacked">
                            <label className="custom-control custom-radio-md">
                                <input
                                    type="radio"
                                    className="custom-control-input"
                                    name="destinatario"
                                    defaultValue="Interno"
                                    onChange={() => {
                                        setVariables({
                                            ...variables,
                                            destinatario: 2,
                                        });
                                        setData("destinatario", "Interno");
                                        selectDirec.current!.clearValue();
                                        setCopiaA(directorio);
                                    }}
                                    checked={
                                        data.destinatario == "Interno"
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
                                    name="destinatario"
                                    defaultValue="Externo"
                                    onChange={() => {
                                        setVariables({
                                            ...variables,
                                            destinatario: 1,
                                        });
                                        setData("destinatario", "Externo");
                                        selectDirec.current!.clearValue();
                                        setCopiaA(externos);
                                    }}
                                    checked={
                                        data.destinatario == "Externo"
                                            ? true
                                            : false
                                    }
                                />
                                <span className="custom-control-label">
                                    Externo
                                </span>
                            </label>
                            <InputError
                                className="mt-1"
                                message={errors.destinatario}
                            />
                        </div>
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col xs={12} sm={6} xl={4}>
                    <div className="form-group">
                        <label htmlFor="directorio">
                            Dirigido a:
                            <p className="obligatorio">*</p>
                        </label>
                        <Select
                            classNamePrefix="Select"
                            ref={selectDirec}
                            options={copiaA}
                            name="dirigido_a"
                            placeholder="Seleccione una opción"
                            onChange={(e: any) => {
                                setData("dirigido_a", e?.value);
                            }}
                        />
                    </div>
                    <InputError className="mt-1" message={errors.dirigido_a} />
                </Col>
            </Row>
            <Row>
                <Col xs={12} className="d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={submit}>
                        Guardar copia
                    </button>
                </Col>

                <Col md={12} className="table-responsive">
                    <DataTable
                        data={copias}
                        options={{
                            language,
                            autoWidth: false,
                        }}
                        columns={[
                            {
                                title: "Nombre",
                                data: "nombre",
                                width: "30%",
                            },
                            {
                                title: "Cargo",
                                data: "cargo",
                                width: "30%",
                            },
                            {
                                title: "Dependencia",
                                data: "dependencia",
                                width: "30%",
                            },
                            {
                                data: "id",
                                title: "Acciones",
                                width: "10%",
                            },
                        ]}
                        className="display table-bordered  border-bottom ancho100"
                        slots={{
                            3: (data: any, row: any) => (
                                <div className="text-center">
                                    <Button
                                        className="btn-icon ml-1"
                                        variant="danger"
                                        title="Eliminar copia"
                                        onClick={() => delCopia(row.id)}
                                    >
                                        <i className="fa fa-trash"></i>
                                    </Button>
                                </div>
                            ),
                        }}
                    ></DataTable>
                </Col>
            </Row>
        </>
    );
};

export default Copias;
