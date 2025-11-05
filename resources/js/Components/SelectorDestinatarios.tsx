import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";
import {
    Button,
    ButtonGroup,
    Col,
    Form,
    InputGroup,
    Row,
    Table,
} from "react-bootstrap";
import * as _ from "lodash";
import "../../css/SelectorDestinatarios.css";

export type Destinatario = {
    id: number;
    cargo: string;
    nombre: string;
    dependencia: string;
    nivel?: string | null;
    es_interno: 0 | 1;
};

type Props = {
    endpoint?: string;
    initialTipo?: "interno" | "externo";
    initialSegmento?: "todos" | "superior" | "medio";
    initialSelected?: Destinatario[];
    perPage?: number;
    onChange?: (selected: Destinatario[]) => void;
};

export type SelectorDestinatariosHandle = {
    clearSelected: () => void;
    getSelected: () => Destinatario[]; // opcional, por si quieres leerlos desde el padre
};

const SelectorDestinatarios = forwardRef<SelectorDestinatariosHandle, Props>(
    (props, ref) => {
        const {
            endpoint = "/api/destinatarios",
            initialTipo = "interno",
            initialSegmento = "todos",
            initialSelected = [],
            perPage = 50, // 👈 50 por defecto
            onChange,
        } = props;

        const pageSize = perPage ?? 50; // 👈 usa siempre pageSize

        const [tipo, setTipo] = useState<"interno" | "externo">(initialTipo);
        const [segmento, setSegmento] = useState<
            "todos" | "medio" | "superior" | "complejos" | "institutos"
        >(initialSegmento);

        const [q, setQ] = useState("");
        const [page, setPage] = useState(1);

        const [results, setResults] = useState<Destinatario[]>([]);
        const [total, setTotal] = useState(0);
        const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
        // seleccionados

        const [selectedMap, setSelectedMap] = useState<
            Map<number, Destinatario>
        >(() => new Map(initialSelected.map((r) => [r.id, r])));
        const selected = useMemo(
            () => Array.from(selectedMap.values()),
            [selectedMap]
        );

        useEffect(() => {
            onChange?.(selected);
        }, [selected, onChange]);

        // excluir los ya elegidos del panel izquierdo
        const visibleResults = useMemo(
            () => results.filter((r) => !selectedMap.has(r.id)),
            [results, selectedMap]
        );

        useImperativeHandle(
            ref,
            () => ({
                clearSelected: () => {
                    setSelectedMap(new Map());
                    setQ("");
                    setTipo("interno");
                    setSegmento("todos");
                    setPage(1);
                },
                getSelected: () => Array.from(selectedMap.values()),
            }),
            [selectedMap] // para que getSelected vea lo último
        );

        // fetch con dependencias actuales
        const fetchData = useCallback(
            async (signal?: AbortSignal) => {
                try {
                    const params = new URLSearchParams({
                        tipo,
                        segmento,
                        q,
                        page: String(page),
                        per_page: String(pageSize),
                    }).toString();

                    const url = `${endpoint}?${params}`;
                    const res = await fetch(url, {
                        signal,
                        credentials: "same-origin",
                    });

                    if (!res.ok) {
                        const text = await res.text(); // para ver si es HTML/419
                        console.error("API error", res.status, text);
                        setResults([]);
                        setTotal(0);
                        return;
                    }

                    const json = await res.json();
                    setResults(Array.isArray(json.data) ? json.data : []);
                    setTotal(Number(json.total) || 0);
                } catch (e) {
                    if ((e as any).name === "AbortError") return;
                    console.error("fetchData error", e);
                    setResults([]);
                    setTotal(0);
                }
            },
            [tipo, segmento, q, page, pageSize, endpoint]
        );
        // debounce que siempre usa la versión vigente de fetchData
        const debouncedFetch = useMemo(
            () =>
                _.debounce((signal?: AbortSignal) => {
                    fetchData(signal);
                }, 250),
            [fetchData]
        );

        useEffect(() => {
            const ctrl = new AbortController();
            debouncedFetch(ctrl.signal);
            return () => {
                ctrl.abort();
                debouncedFetch.cancel();
            };
        }, [debouncedFetch]);

        const runSearchNow = () => {
            const ctrl = new AbortController();
            debouncedFetch.cancel();
            fetchData(ctrl.signal);
        };

        // helpers selección
        const addOne = (row: Destinatario) =>
            setSelectedMap((prev) => new Map(prev).set(row.id, row));

        const addMany = (rows: Destinatario[]) =>
            setSelectedMap((prev) => {
                const n = new Map(prev);
                rows.forEach((r) => n.set(r.id, r));
                return n;
            });

        const removeOne = (row: Destinatario) =>
            setSelectedMap((prev) => {
                const n = new Map(prev);
                n.delete(row.id);
                return n;
            });

        const clearAll = () => setSelectedMap(new Map());

        return (
            <div className="p-2">
                {/* Barra de controles superior */}
                <Row className="mb-3 g-2 align-items-center">
                    <Col md="auto">
                        <ButtonGroup className="seg-control gap-2">
                            <Button
                                size="sm"
                                className="seg-btn"
                                variant={
                                    tipo === "interno"
                                        ? "primary"
                                        : "outline-primary"
                                }
                                onClick={() => {
                                    setTipo("interno");
                                    setPage(1);
                                }}
                            >
                                Interno
                            </Button>
                            <Button
                                size="sm"
                                className="seg-btn"
                                variant={
                                    tipo === "externo"
                                        ? "primary"
                                        : "outline-primary"
                                }
                                onClick={() => {
                                    setTipo("externo");
                                    setPage(1);
                                }}
                            >
                                Externo
                            </Button>
                        </ButtonGroup>
                    </Col>

                    {/* Pills de nivel (solo si Interno) */}
                    {tipo === "interno" && (
                        <Col md className="pills-scroll">
                            <ButtonGroup className="level-pills gap-2">
                                {[
                                    { key: "todos", label: "Todos" },
                                    {
                                        key: "medio",
                                        label: "Nivel Medio Superior",
                                    },
                                    {
                                        key: "superior",
                                        label: "Nivel Superior",
                                    },
                                    { key: "complejos", label: "Complejos" },
                                    { key: "institutos", label: "Institutos" },
                                ].map(({ key, label }) => (
                                    <Button
                                        key={key}
                                        size="sm"
                                        className="level-pill"
                                        variant={
                                            segmento === (key as any)
                                                ? "secondary"
                                                : "outline-secondary"
                                        }
                                        onClick={() => {
                                            setSegmento(key as any);
                                            setPage(1);
                                        }}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </ButtonGroup>
                        </Col>
                    )}
                </Row>

                {/* Búsqueda */}
                <Row className="mb-3">
                    <Col lg>
                        <InputGroup>
                            <InputGroup.Text>🔎</InputGroup.Text>
                            <Form.Control
                                value={q}
                                onChange={(e) => {
                                    setQ(e.target.value);
                                    setPage(1);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") runSearchNow();
                                }}
                                placeholder="Buscar por nombre o dependencia…"
                            />
                            <Button
                                variant="outline-primary"
                                onClick={runSearchNow}
                            >
                                Buscar
                            </Button>
                        </InputGroup>
                    </Col>
                </Row>

                {/* ====== GRID: Resultados | Botones | Seleccionados ====== */}
                <div className="selector-grid">
                    {/* Resultados */}
                    <div className="selector-card">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Resultados</strong>
                            <small>
                                {visibleResults.length} visibles (de {total})
                            </small>
                        </div>

                        <div className="table-fixed">
                            <Table striped hover size="sm" className="mb-0">
                                <thead>
                                    <tr>
                                        <th>CARGO</th>
                                        <th>NOMBRE</th>
                                        <th>DEPENDENCIA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleResults.map((row) => (
                                        <tr
                                            key={row.id}
                                            onDoubleClick={() => addOne(row)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td>{row.cargo}</td>
                                            <td>{row.nombre}</td>
                                            <td>{row.dependencia}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <Button
                                size="sm"
                                onClick={() => addMany(visibleResults)}
                            >
                                {">> Agregar visibles"}
                            </Button>

                            <div className="d-flex align-items-center gap-2">
                                <small>
                                    Página {page} de {totalPages}
                                </small>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    disabled={page <= 1}
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                >
                                    Anterior
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    disabled={
                                        page >=
                                        Math.max(
                                            1,
                                            Math.ceil(
                                                (total || 0) / (perPage || 50)
                                            )
                                        )
                                    }
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1)
                                        )
                                    }
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Botones (columna central fija) */}
                    <div className="btn-col">
                        <div className="btn-stack">
                            <Button onClick={() => addMany(visibleResults)}>
                                {">>"}
                            </Button>
                            <Button
                                variant="outline-secondary"
                                onClick={clearAll}
                            >
                                {"<<"}
                            </Button>
                        </div>
                    </div>

                    {/* Seleccionados */}
                    <div className="selector-card">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Seleccionados</strong>
                            <small>{selected.length}</small>
                        </div>

                        <div className="table-fixed">
                            <Table striped hover size="sm" className="mb-0">
                                <thead>
                                    <tr>
                                        <th>CARGO</th>
                                        <th>NOMBRE</th>
                                        <th>DEPENDENCIA</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selected.map((row) => (
                                        <tr key={row.id}>
                                            <td>{row.cargo}</td>
                                            <td>{row.nombre}</td>
                                            <td>{row.dependencia}</td>
                                            <td className="text-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() =>
                                                        removeOne(row)
                                                    }
                                                >
                                                    Quitar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <div className="d-flex gap-2 mt-2">
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={clearAll}
                            >
                                Quitar todo
                            </Button>
                        </div>
                    </div>
                </div>
                {/* ====== /GRID ====== */}
            </div>
        );
    }
);
export default SelectorDestinatarios;
