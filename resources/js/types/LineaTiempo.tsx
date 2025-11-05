import "@react-pdf-viewer/core/lib/styles/index.css";
import { Offcanvas } from "react-bootstrap";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Parser } from "html-to-react";

const LineaTiempo = ({
    id,
    showLinea,
    setShowLinea,
}: {
    id: number;
    showLinea: boolean;
    setShowLinea: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const [datos, setDatos] = useState([
        {
            id: 0,
            id_oficio: "",
            accion: "",
            descripcion: "",
            icono: "",
            fecha: "",
            color: "",
        },
    ]);

    useEffect(() => {
        if (id != 0) {
            getDatos();
        }
    }, [id]);

    const getDatos = async () => {
        const response = await fetch(route("oficios.getLineaTiempo", { id }), {
            method: "get",
        });

        const datos = await response.json();

        if (datos.code == 200) {
            setDatos(datos.data);
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

    return (
        <Offcanvas
            show={showLinea}
            onHide={() => setShowLinea(false)}
            placement="end"
            className="ancho40"
        >
            <Offcanvas.Header>
                <Offcanvas.Title></Offcanvas.Title>
                <span
                    className="d-flex ms-auto"
                    onClick={() => setShowLinea(false)}
                >
                    <i className="fe fe-x ms-auto"></i>
                </span>
            </Offcanvas.Header>
            <Offcanvas.Body>
                <div className="vtimeline">
                    {datos.map((x, i) => {
                        return (
                            <div
                                key={x.id}
                                className={
                                    (i + 1) % 2 === 0
                                        ? `timeline-wrapper timeline-inverted  timeline-wrapper-${x.color}`
                                        : `timeline-wrapper  timeline-wrapper-${x.color}`
                                }
                            >
                                <div className="avatar avatar-md timeline-badge">
                                    <span className="timeline-icon">
                                        <i className={x.icono}></i>
                                    </span>
                                </div>
                                <div className="timeline-panel">
                                    <div className="timeline-heading">
                                        <h6 className="timeline-title">
                                            {x.accion}
                                        </h6>
                                    </div>
                                    <div className="timeline-body">
                                        <p></p>
                                        {Parser().parse(x.descripcion)}
                                    </div>
                                    <div className="timeline-footer d-flex align-items-center flex-wrap">
                                        <span className="ms-auto">
                                            <i className="fe fe-calendar text-muted mx-1"></i>
                                            {x.fecha}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Offcanvas.Body>
        </Offcanvas>
    );
};

export default LineaTiempo;
