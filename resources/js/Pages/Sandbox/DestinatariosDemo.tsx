import AppLayout from "@/Layouts/app";
import { Head } from "@inertiajs/react";
import SelectorDestinatarios from "@/Components/SelectorDestinatarios";
import { useState } from "react";

import { Card, Row, Col, Form, Tabs, Tab, Button } from "react-bootstrap";
import TituloCard from "@/types/TituloCard";

export default function DestinatariosDemo() {
    const [seleccion, setSeleccion] = useState<any[]>([]);

    return (
        <AppLayout>
            <Head title="LAB: Destinatarios" />
            <div className="container py-3">
                <Card.Header className="d-flex justify-content-between">
                    <Card.Title as="h3">
                        <TituloCard titulo="Destinatarios" obligatorio={true} />
                    </Card.Title>
                </Card.Header>

                <SelectorDestinatarios
                    // 👉 endpoint demo (no toca tu backend real)
                    endpoint="/api/destinatarios-demo"
                    initialTipo="interno"
                    initialSegmento="todos"
                    onChange={setSeleccion}
                    perPage={25}
                />

                <div className="d-flex justify-content-between mt-3">
                    <div>
                        <strong>{seleccion.length}</strong> seleccionado(s)
                    </div>
                    <Button
                        onClick={() => console.log("Seleccion:", seleccion)}
                    >
                        Guardar
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
