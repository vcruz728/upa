import JSZip from "jszip";
(window as any).JSZip = JSZip;

import Buttons from "datatables.net-buttons-bs5";
import "datatables.net-buttons/js/buttons.html5.js";
import "datatables.net-buttons-bs5/css/buttons.bootstrap5.css";

import AppLayout from "../../Layouts/app";
import { Head, Link, router, useRemember } from "@inertiajs/react";
import { useState, Fragment, useEffect, useRef } from "react";
import { Card, Row, Col, Button, Tabs, Tab } from "react-bootstrap";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import "filepond/dist/filepond.min.css";
// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import LineaTiempo from "@/types/LineaTiempo";
import VerPdf from "@/types/VerPdf";

import $ from "jquery";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import Responsive from "datatables.net-responsive-bs5";
import "../../../css/botones.css";
import { getStatusLabel } from "../../../js/utils/status";
import FiltroEstatusPills from "@/Components/FiltroEstatusPills";
(window as any).$ = $;
(window as any).jQuery = $;

// activar plugins
DataTable.use(DT);
DataTable.use(Responsive);
DataTable.use(Buttons);

// Mapea el valor numérico de tu semáforo al texto “bonito” que quieres en Excel
const excelStatusLabel = (n: number): string => {
    switch (Number(n)) {
        case 1:
            return "Se dio respuesta en tiempo";
        case 2:
            return "Sin respuesta, en tiempo";
        case 3:
            return "Sin respuesta, fuera de tiempo";
        case 4:
            return "Se dio respuesta fuera de tiempo";
        case 0:
            return "Informativos";
        default:
            return "";
    }
};

// ===== helpers / estilos locales =====
const tableClass =
    "table table-hover align-middle w-100 table-bordered border-bottom";

const ensureScopedStyles = () => {
    const id = "listado-oficios-styles";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
/* === Scope general === */
.listado-oficios-scope table thead th{ text-transform:none!important; }
.listado-oficios-scope .dt-vmiddle{ vertical-align:middle!important; }
.listado-oficios-scope .texto-justificable{ text-align:justify; }
.listado-oficios-scope .no-break-words{ word-break:normal; overflow-wrap:break-word; hyphens:auto; }

/* Semáforo */
.listado-oficios-scope td.col-semaforo,
.listado-oficios-scope tr:hover td.col-semaforo,
.listado-oficios-scope tr.table-active td.col-semaforo,
.listado-oficios-scope tr.selected td.col-semaforo{
  background-color:var(--semaforo,#eee)!important;
  background-image:none!important;
  height:32px; border:1px solid #eee;
}

/* Fuerza ancho de la columna Estatus */
.listado-oficios-scope #activos-table thead th:first-child,
.listado-oficios-scope #historico-table thead th:first-child{
  width:36px; min-width:36px;
}
.listado-oficios-scope td.col-semaforo{
  width:36px!important; min-width:36px!important; max-width:36px!important;
}

/* === Detalle Responsive bonito === */
.listado-oficios-scope .mo-child{ padding:12px 10px; background:#fff; }
.listado-oficios-scope .mo-row{ padding:12px 6px; border-top:1px solid #eee; }
.listado-oficios-scope .mo-row:first-child{ border-top:0; }
.listado-oficios-scope .mo-label{
  display:block; font-weight:700; color:#475569; text-align:center; margin-bottom:6px;
}
.listado-oficios-scope .mo-value{ text-align:center; word-break:break-word; }
.listado-oficios-scope .mo-value .texto-justificable{ text-align:justify; }

/* === Triangulito centrado SOLO en modo colapsado === */
.listado-oficios-scope td.col-semaforo.dtr-control{ position:relative; cursor:pointer; padding-left:0!important; }

/* Oculta caret por defecto de DataTables */
.listado-oficios-scope table.dataTable > tbody > tr > td.col-semaforo.dtr-control::before{
  content:""!important; display:none!important;
}

/* Por defecto no mostrar nada */
.listado-oficios-scope td.col-semaforo.dtr-control::after{ content:""; display:none; }

/* Mostrar caret cuando la tabla está colapsada */
.listado-oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr >
td.col-semaforo.dtr-control::after{
  content:"▸";
  display:block; position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%); font-size:18px; line-height:1;
  color:rgba(0,0,0,.75); pointer-events:none;
}

/* Abierto */
.listado-oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr.parent >
td.col-semaforo.dtr-control::after{ content:"▾"; color:rgba(0,0,0,.9); }

/* También cambiar caret usando la clase que togglenamos por JS */
.listado-oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr >
td.col-semaforo.dtr-control.is-open::after{
  content:"▾";
  display:block; position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%); font-size:18px; line-height:1;
  color:rgba(0,0,0,.9);
}

/* (opcional) un poquito de énfasis visual cuando está abierto */
.listado-oficios-scope td.col-semaforo.dtr-control.is-open{
  outline: 0;
}
/* Hover/Zebra no pinten encima del semáforo */
.listado-oficios-scope .table-hover tbody tr:hover > td.col-semaforo,
.listado-oficios-scope .table-striped tbody tr:nth-of-type(odd) > td.col-semaforo{
  background-color:var(--semaforo)!important;
}

/* === Toolbar unificada (lo que ya tenías) === */
.listado-oficios-scope .dt-toolbar{ margin-bottom:.5rem; }
.listado-oficios-scope .dt-toolbar-left,
.listado-oficios-scope .dt-toolbar-right{ display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; }
.listado-oficios-scope .dt-toolbar label{ margin:0; font-weight:600; font-size:.9rem; line-height:1.2; }
.listado-oficios-scope .dt-toolbar .form-select.form-select-sm,
.listado-oficios-scope .dt-toolbar .form-control.form-control-sm{ font-size:.9rem; line-height:1.45; height:auto; padding:.25rem .5rem; }
.listado-oficios-scope .dt-length label{ display:inline-flex; align-items:center; gap:.5rem; white-space:nowrap; }
.listado-oficios-scope .dt-length select{ min-width:6rem; }
.listado-oficios-scope .vd-inline{ display:inline-flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
.listado-oficios-scope .vd-inline select{ width:clamp(14rem,32vw,26rem); }
.listado-oficios-scope .dt-search label{ display:inline-flex; align-items:center; gap:.5rem; white-space:nowrap; margin:0; }
.listado-oficios-scope .dt-search input{ width:16rem; max-width:100%; }
.listado-oficios-scope .dt-buttons .btn{ white-space:nowrap; }

/* Breakpoints */
@media (max-width:992px){
  .listado-oficios-scope .dt-toolbar-left,
  .listado-oficios-scope .dt-toolbar-right{ gap:.5rem; }
  .listado-oficios-scope .dt-toolbar .dt-search{ flex:1 1 100%; }
  .listado-oficios-scope .dt-toolbar .dt-search input{ width:100%; }
  .listado-oficios-scope .vd-inline select{ width:100%; min-width:0; }
}
@media (max-width:576px){
  .listado-oficios-scope .dt-length label{ flex-wrap:wrap; }
  .listado-oficios-scope .vd-inline{ width:100%; }
}

/* Oculta caret por defecto de DataTables (ambas clases posibles) */
.listado-oficios-scope table.dataTable > tbody > tr >
td.col-semaforo.dtr-control::before,
.listado-oficios-scope table.dataTable > tbody > tr >
td.col-semaforo.dt-control::before{
  content:""!important; display:none!important;
}

/* Caret cerrado por defecto SOLO cuando la tabla está colapsada */
.listado-oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr >
td.col-semaforo.dtr-control::after{
  content:"▸";
  display:block; position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%); font-size:18px; line-height:1;
  color:rgba(0,0,0,.75); pointer-events:none;
}

/* Caret ABIERTO: cubre DT v1 (parent), DT v2 (dtr-expanded), nuestra clase, y aria-expanded */
.listado-oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr.parent >
td.col-semaforo.dtr-control::after,
.listado-oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr.dtr-expanded >
td.col-semaforo.dtr-control::after,
.listado-oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr >
td.col-semaforo.dtr-control.is-open::after,
.listado-oficios-scope table.dataTable.dtr-inline > tbody > tr >
td.col-semaforo.dtr-control[aria-expanded="true"]::after{
  content:"▾";
  display:block; position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%); font-size:18px; line-height:1;
  color:rgba(0,0,0,.9);
}
`;
    document.head.appendChild(s);
};

const excelStatusMap = (n: number) => {
    switch (Number(n)) {
        case 1:
            return { txt: "Se dio respuesta en tiempo", argb: "FF5FD710" };
        case 2:
            return { txt: "Sin respuesta, en tiempo", argb: "FFF5F233" };
        case 3:
            return { txt: "Sin respuesta, fuera de tiempo", argb: "FFF98200" };
        case 4:
            return {
                txt: "Se dio respuesta fuera de tiempo",
                argb: "FFFF2D2D",
            };
        case 0:
            return { txt: "Informativos", argb: "FF2A0DBD" };
        default:
            return { txt: "—", argb: "FFFFFFFF" };
    }
};

// Render bonito para filas ocultas (etiqueta + valor, con HTML original)
const makeDetailsRenderer =
    (wantedTitles: string[]) =>
    (_api: any, _rowIdx: number, columns: any[]) => {
        const rows = columns.filter(
            (c) => c.hidden && wantedTitles.includes(String(c.title).trim())
        );
        if (!rows.length) return false;

        const wrap = document.createElement("div");
        wrap.className = "mo-child";

        rows.forEach((c) => {
            const sec = document.createElement("div");
            sec.className = "mo-row";

            const label = document.createElement("div");
            label.className = "mo-label";
            label.textContent = String(c.title).trim();

            const value = document.createElement("div");
            value.className = "mo-value";
            value.innerHTML =
                c.data && String(c.data).trim() !== "" ? c.data : "—";

            sec.appendChild(label);
            sec.appendChild(value);
            wrap.appendChild(sec);
        });

        return wrap;
    };

// Utilidad de filtrado (estatus 0 = todos)
const filtraPorEstatus = (arr: any[], valor: string) => {
    const v = Number(valor);
    if (v === 0) return arr ?? [];
    return (arr ?? []).filter((x: any) => Number(x.estatus_valor) === v);
};

function fechaCorta(isoLike: string | number | Date) {
    if (!isoLike) return "";
    const d = new Date(
        typeof isoLike === "string" ? isoLike.replace(" ", "T") : isoLike
    );
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(
        d.getHours()
    )}:${p(d.getMinutes())}`;
}

function formatVence(iso: string | number | Date) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ====== Navegación preservando scroll (solo Inertia) ======
const visitWithScroll = (href: string) => {
    router.visit(href, { preserveScroll: true });
};

// stateSave helpers (usa localStorage con clave por tabla)
const dtStateSave = (key: string) => ({
    stateSave: true,
    stateDuration: -1,
    stateSaveCallback: (_s: any, data: any) =>
        localStorage.setItem(key, JSON.stringify(data)),
    stateLoadCallback: (_s: any) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },
    // por si cambia el # de columnas, evitar errores por órdenes inválidas
    stateLoadParams: (settings: any, data: any) => {
        if (Array.isArray(data?.order)) {
            const cols = settings.aoColumns?.length ?? 0;
            data.order = data.order.filter((o: any) => o[0] < cols);
        }
    },
});

// recálculo global de tablas visibles
const recalcAllDT = () => {
    const api = ($.fn.dataTable as any).tables({ api: true, visible: true });
    if (!api?.columns) return;
    try {
        api.columns.adjust();
        (api as any).responsive?.recalc?.();
    } catch {
        /* noop */
    }
};

export default function Recepcion({
    oficios,
    nuevoHistorico,
    informativos: informativosProp,
}: {
    oficios: any[];
    nuevoHistorico: any[];
    informativos: any[];
}) {
    // fecha corta bajo 1600px
    const is1600DownRef = useRef(false);

    const [showLinea, setShowLinea] = useState(false);
    const [show, setShow] = useState(false);
    const [variables, setVariables] = useState({
        urlPdf: "",
        extension: "",
        idOfico: 0,
    });

    // bases y vistas
    const [activosBase, setActivosBase] = useState<any[]>([]);
    const [historicoBase, setHistoricoBase] = useState<any[]>([]);
    const [activos, setActivos] = useState<any[]>([]);
    const [historico, setHistorico] = useState<any[]>([]);
    const [informativos, setInformativos] = useState<any[]>([]);

    // filtros recordados
    const [filtroActivos, setFiltroActivos] = useRemember<string>(
        "0",
        "ui.filtro.activos"
    );
    const [filtroHistorico, setFiltroHistorico] = useRemember<string>(
        "0",
        "ui.filtro.historico"
    );
    const [activeTab, setActiveTab] = useRemember<
        "tab1" | "tab2" | "tab3" | "tab5"
    >("tab1", "ui.tab");

    // Utilidad de filtrado (estatus 0 = todos)
    const filtraPorEstatus = (arr: any[], valor: string) => {
        const v = Number(valor);
        if (v === 0) return arr ?? [];
        return (arr ?? []).filter((x: any) => Number(x.estatus_valor) === v);
    };

    // --- Base de opciones para TODAS las tablas ---
    const baseDtOptions = {
        language,
        responsive: { details: { type: "inline", target: "td.dtr-control" } },
        autoWidth: false,
        scrollX: false,
        stripeClasses: [],
        columnDefs: [{ targets: "_all", className: "dt-vmiddle text-center" }],
        drawCallback: function (this: any) {
            const api = this.api();
            api.columns.adjust();
            (api as any).responsive?.recalc?.();
        },
    };

    const tableClass =
        "table table-hover align-middle w-100 table-bordered border-bottom";

    useEffect(() => ensureScopedStyles(), []);

    useEffect(() => {
        const list = Array.isArray(oficios) ? oficios : [];
        const norm = list.map((it: any) => ({
            ...it,
            id_area_num: Number(it.id_area),
            hasRespuesta:
                it.archivo_respuesta != null && it.archivo_respuesta !== "",
        }));

        // Ajusta los filtros base (como lo tenías antes)
        setActivosBase(
            norm.filter((x: any) => !x.hasRespuesta && x.id_area_num !== 1)
        );
        setHistoricoBase(
            norm.filter((x: any) => x.hasRespuesta && x.id_area_num !== 1)
        );

        setInformativos(
            Array.isArray(informativosProp) ? informativosProp : []
        );
    }, [oficios, informativosProp]);

    // Deja que el navegador no restaure por su cuenta
    useEffect(() => {
        try {
            window.history.scrollRestoration = "manual";
        } catch {}
    }, []);

    // aplica filtros de estatus (0=todos)
    const filtra = (arr: any[], v: string) => {
        const n = Number(v);
        if (n === 0) return arr ?? [];
        return (arr ?? []).filter((x: any) => Number(x.estatus_valor) === n);
    };

    // responsive + redibujar fechas al cambiar tamaño/tabs/zoom
    useEffect(() => {
        const debounce = (() => {
            let t: any;
            return () => {
                clearTimeout(t);
                t = setTimeout(recalcAllDT, 120);
            };
        })();

        const onResize = debounce;
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onResize);
        document.addEventListener("visibilitychange", onResize);

        let lastDpr = window.devicePixelRatio;
        const dprTimer = window.setInterval(() => {
            if (window.devicePixelRatio !== lastDpr) {
                lastDpr = window.devicePixelRatio;
                recalcAllDT();
            }
        }, 300);

        setTimeout(recalcAllDT, 0);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("orientationchange", onResize);
            document.removeEventListener("visibilitychange", onResize);
            clearInterval(dprTimer);
        };
    }, []);

    // media query para fecha corta
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1600px)");
        const onChange = () => {
            is1600DownRef.current = mq.matches;
            const api = ($.fn.dataTable as any).tables({
                api: true,
                visible: true,
            });
            api?.rows?.().invalidate("data").draw(false);
            try {
                api.columns.adjust();
                (api as any).responsive?.recalc?.();
            } catch {
                /* noop */
            }
        };
        onChange();
        mq.addEventListener?.("change", onChange);
        mq.addListener?.(onChange);
        return () => {
            mq.removeEventListener?.("change", onChange);
            mq.removeListener?.(onChange);
        };
    }, []);

    useEffect(() => {
        const $doc: any = $(document) as any;
        const handler = (_e: any, _dt: any, row: any, show: boolean) => {
            const tr = row?.node?.();
            $("td.col-semaforo.dtr-control", tr).toggleClass("is-open", !!show);
        };
        $doc.on("responsive-display.dt", handler);
        return () => $doc.off("responsive-display.dt", handler);
    }, []);

    useEffect(() => {
        setActivos(filtraPorEstatus(activosBase, filtroActivos));
    }, [activosBase, filtroActivos]);

    useEffect(() => {
        setHistorico(filtraPorEstatus(historicoBase, filtroHistorico));
    }, [historicoBase, filtroHistorico]);

    // monta filtro de estatus al lado de "Mostrar"
    const mountEstatusFilter = (
        settings: any,
        containerClass: string,
        value: string,
        onChange: (v: string) => void
    ) => {
        const $wrap = ($(settings.nTableWrapper) as any).find(containerClass);
        if ($wrap.children().length) return;

        const $label = $(`
      <label class="vd-inline">
        <span class="me-1">Estatus:</span>
        <select class="form-select form-select-sm dt-estatus-select">
          <option value="0">Todos</option>
          <option value="1">Se dio respuesta en tiempo</option>
          <option value="2">Sin respuesta, en tiempo</option>
          <option value="3">Sin respuesta, fuera de tiempo</option>
          <option value="4">Se dio respuesta fuera de tiempo</option>
        </select>
      </label>
    `);

        $label
            .find("select")
            .val(value)
            .on("change", (e: any) => onChange(e.target.value));
        $wrap.append($label);
    };

    // Antes hacía fetch. Ahora filtra en memoria.
    const filtroTabla = (valor: string, tipo: "activos" | "historico_vd") => {
        if (tipo === "activos") {
            setActivos(filtraPorEstatus(activosBase, valor));
        } else {
            setHistorico(filtraPorEstatus(historicoBase, valor));
        }
    };

    return (
        <AppLayout>
            <Head>
                <title>Listado de oficios</title>
                <meta
                    name="listado de oficios"
                    content="Visualiza la lista de oficios ingresados a la VD"
                />
            </Head>

            <Fragment>
                <PageHeader
                    titles="Listado de oficios"
                    active="Listado de oficios"
                    items={[]}
                />

                <Row>
                    <Col lg={12} md={12}>
                        <Card>
                            <Card.Header className="d-flex justify-content-between">
                                <Card.Title as="h3">
                                    Listado de oficios
                                </Card.Title>
                                <div className="tags">
                                    <span className="tag tag-radius tag-round tag-verde">
                                        Se dio respuesta en tiempo
                                    </span>
                                    <span className="tag tag-radius tag-round tag-amarillo">
                                        Sin respuesta, en tiempo
                                    </span>
                                    <span className="tag tag-radius tag-round tag-naranja">
                                        Sin respuesta, fuera de tiempo
                                    </span>
                                    <span className="tag tag-radius tag-round tag-rojo">
                                        Se dio respuesta fuera de tiempo
                                    </span>
                                </div>
                            </Card.Header>

                            <Card.Body>
                                <div
                                    className="panel panel-default listado-oficios-scope"
                                    lang="es"
                                >
                                    <Tabs
                                        activeKey={activeTab}
                                        onSelect={(k) => {
                                            setActiveTab((k as any) ?? "tab1");
                                            // tras cambiar de tab, recalcular DT sin mover scroll
                                            setTimeout(recalcAllDT, 0);
                                        }}
                                    >
                                        {/* ================ ACTIVOS ================ */}
                                        <Tab eventKey="tab1" title="Activos">
                                            <Col md={12}>
                                                <div className="d-grid gap-2 mb-2">
                                                    <FiltroEstatusPills
                                                        value={filtroActivos}
                                                        onChange={(v) => {
                                                            setFiltroActivos(v);
                                                            filtroTabla(
                                                                v,
                                                                "activos"
                                                            );
                                                        }}
                                                        variante="activos"
                                                    />
                                                    <div className="d-flex justify-content-end">
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={() => {
                                                                const t = (
                                                                    jQuery as any
                                                                )(
                                                                    "#activos-table"
                                                                ).DataTable();
                                                                const rowsApi =
                                                                    t.rows({
                                                                        search: "applied",
                                                                        order: "applied",
                                                                    });
                                                                const dataArr =
                                                                    rowsApi
                                                                        .data()
                                                                        .toArray() as any[];
                                                                (
                                                                    window as any
                                                                ).__DT_EXPORT_ACTIVOS__ =
                                                                    {
                                                                        colors: dataArr.map(
                                                                            (
                                                                                r
                                                                            ) =>
                                                                                String(
                                                                                    r?.color ??
                                                                                        "#ffffff"
                                                                                )
                                                                        ),
                                                                        labels: dataArr.map(
                                                                            (
                                                                                r
                                                                            ) =>
                                                                                excelStatusLabel(
                                                                                    r?.estatus_valor
                                                                                )
                                                                        ),
                                                                        count: dataArr.length,
                                                                    } as any;
                                                                t.button(
                                                                    ".buttons-excel"
                                                                ).trigger();
                                                            }}
                                                        >
                                                            Exportar a Excel
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-center my-2">
                                                    <Link
                                                        className="btn btn-primary"
                                                        href={route(
                                                            "oficios.recepcionOficio"
                                                        )}
                                                        preserveScroll
                                                    >
                                                        <i className="fe fe-plus me-2" />
                                                        Nueva recepción
                                                    </Link>
                                                </div>
                                            </Col>

                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
                                                <DataTable
                                                    id="activos-table"
                                                    data={activos}
                                                    className={tableClass}
                                                    options={{
                                                        ...dtStateSave(
                                                            "dt:vd:activos"
                                                        ),
                                                        ...baseDtOptions,
                                                        responsive: {
                                                            ...baseDtOptions.responsive,
                                                            details: {
                                                                ...(
                                                                    baseDtOptions as any
                                                                ).responsive
                                                                    .details,
                                                                renderer:
                                                                    makeDetailsRenderer(
                                                                        [
                                                                            "No. Oficio / Folio",
                                                                            "Tipo de ingreso",
                                                                            "Unidad Académica o Dependencia",
                                                                            "Área responsable",
                                                                            "Proceso que impacta",
                                                                            "Descripción",
                                                                        ]
                                                                    ),
                                                            },
                                                        },
                                                        autoWidth: false,

                                                        order: [[1, "desc"]],
                                                        lengthMenu: [
                                                            [25, 50, 100],
                                                            [25, 50, 100],
                                                        ],
                                                        pageLength: 25,
                                                        buttons: [
                                                            {
                                                                extend: "excelHtml5",
                                                                text: "Exportar a Excel",
                                                                exportOptions: {
                                                                    modifier: {
                                                                        search: "applied",
                                                                        order: "applied",
                                                                    },
                                                                    columns: [
                                                                        1, 2, 3,
                                                                        4, 5, 6,
                                                                        7,
                                                                    ], // omite semáforo y acciones
                                                                },
                                                                customize:
                                                                    function (
                                                                        xlsx: any
                                                                    ) {
                                                                        const $$ =
                                                                            (
                                                                                window as any
                                                                            )
                                                                                .jQuery ||
                                                                            (
                                                                                window as any
                                                                            ).$;
                                                                        const sheet =
                                                                            xlsx
                                                                                .xl
                                                                                .worksheets[
                                                                                "sheet1.xml"
                                                                            ];
                                                                        const dt =
                                                                            (
                                                                                $(
                                                                                    "#activos-table"
                                                                                ) as any
                                                                            ).DataTable();
                                                                        const rows =
                                                                            dt
                                                                                .rows(
                                                                                    {
                                                                                        search: "applied",
                                                                                        order: "applied",
                                                                                    }
                                                                                )
                                                                                .data()
                                                                                .toArray() as any[];

                                                                        // limpia A salvo A1
                                                                        $$(
                                                                            'row c[r^="A"]',
                                                                            sheet
                                                                        ).each(
                                                                            function (
                                                                                this: Element
                                                                            ) {
                                                                                const r =
                                                                                    parseInt(
                                                                                        (
                                                                                            ($$(
                                                                                                this
                                                                                            ).attr(
                                                                                                "r"
                                                                                            ) as string) ||
                                                                                            "A0"
                                                                                        ).substring(
                                                                                            1
                                                                                        ),
                                                                                        10
                                                                                    );
                                                                                if (
                                                                                    r !==
                                                                                    1
                                                                                )
                                                                                    $$(
                                                                                        this
                                                                                    ).remove();
                                                                            }
                                                                        );

                                                                        const headerStyle =
                                                                            $$(
                                                                                'row[r="2"] c[r="B2"]',
                                                                                sheet
                                                                            ).attr(
                                                                                "s"
                                                                            ) ||
                                                                            "0";
                                                                        $$(
                                                                            'row[r="2"]',
                                                                            sheet
                                                                        ).prepend(
                                                                            `<c r="A2" t="inlineStr" s="${headerStyle}"><is><t>Estatus</t></is></c>`
                                                                        );

                                                                        const styleCache: Record<
                                                                            string,
                                                                            number
                                                                        > = {};
                                                                        const ensureFillStyle =
                                                                            (
                                                                                argb: string
                                                                            ): number => {
                                                                                if (
                                                                                    styleCache[
                                                                                        argb
                                                                                    ]
                                                                                )
                                                                                    return styleCache[
                                                                                        argb
                                                                                    ];
                                                                                const styles =
                                                                                    xlsx
                                                                                        .xl[
                                                                                        "styles.xml"
                                                                                    ];
                                                                                const $s =
                                                                                    $$(
                                                                                        styles
                                                                                    );
                                                                                const $fills =
                                                                                    $s.find(
                                                                                        "fills"
                                                                                    );
                                                                                const $cellXfs =
                                                                                    $s.find(
                                                                                        "cellXfs"
                                                                                    );
                                                                                const fillsCount =
                                                                                    parseInt(
                                                                                        $fills.attr(
                                                                                            "count"
                                                                                        ) ||
                                                                                            "0",
                                                                                        10
                                                                                    );
                                                                                $fills.append(
                                                                                    `<fill><patternFill patternType="solid"><fgColor rgb="${argb}"/><bgColor indexed="64"/></patternFill></fill>`
                                                                                );
                                                                                $fills.attr(
                                                                                    "count",
                                                                                    String(
                                                                                        fillsCount +
                                                                                            1
                                                                                    )
                                                                                );
                                                                                const xfsCount =
                                                                                    parseInt(
                                                                                        $cellXfs.attr(
                                                                                            "count"
                                                                                        ) ||
                                                                                            "0",
                                                                                        10
                                                                                    );
                                                                                const xfId =
                                                                                    xfsCount;
                                                                                $cellXfs.append(
                                                                                    `<xf numFmtId="0" fontId="0" fillId="${fillsCount}" borderId="0" xfId="0" applyFill="1"/>`
                                                                                );
                                                                                $cellXfs.attr(
                                                                                    "count",
                                                                                    String(
                                                                                        xfsCount +
                                                                                            1
                                                                                    )
                                                                                );
                                                                                styleCache[
                                                                                    argb
                                                                                ] =
                                                                                    xfId;
                                                                                return xfId;
                                                                            };

                                                                        const esc =
                                                                            (
                                                                                s: string
                                                                            ) =>
                                                                                (
                                                                                    s ||
                                                                                    ""
                                                                                )
                                                                                    .replace(
                                                                                        /&/g,
                                                                                        "&amp;"
                                                                                    )
                                                                                    .replace(
                                                                                        /</g,
                                                                                        "&lt;"
                                                                                    )
                                                                                    .replace(
                                                                                        />/g,
                                                                                        "&gt;"
                                                                                    );

                                                                        rows.forEach(
                                                                            (
                                                                                r,
                                                                                i
                                                                            ) => {
                                                                                const n =
                                                                                    3 +
                                                                                    i;
                                                                                const {
                                                                                    txt,
                                                                                    argb,
                                                                                } =
                                                                                    excelStatusMap(
                                                                                        r?.estatus_valor
                                                                                    );
                                                                                const sIdx =
                                                                                    ensureFillStyle(
                                                                                        argb
                                                                                    );
                                                                                $$(
                                                                                    `row[r="${n}"]`,
                                                                                    sheet
                                                                                ).prepend(
                                                                                    `<c r="A${n}" t="inlineStr" s="${sIdx}"><is><t>${esc(
                                                                                        txt
                                                                                    )}</t></is></c>`
                                                                                );
                                                                            }
                                                                        );
                                                                    },
                                                            },
                                                        ],
                                                        columnDefs: [
                                                            ...(
                                                                baseDtOptions as any
                                                            ).columnDefs,
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 0,
                                                            }, // Estatus
                                                            {
                                                                responsivePriority: 2,
                                                                targets: 1,
                                                            }, // Fecha
                                                            {
                                                                responsivePriority: 4,
                                                                targets: 2,
                                                            }, // Tipo ingreso

                                                            {
                                                                responsivePriority: 0,
                                                                targets: 3,
                                                            }, // No Oficio/Folio
                                                            {
                                                                responsivePriority: 5,
                                                                targets: 4,
                                                            }, // Dependencia/UA
                                                            {
                                                                responsivePriority: 4,
                                                                targets: 5,
                                                            }, // Área responsable
                                                            {
                                                                responsivePriority: 5,
                                                                targets: 6,
                                                            }, // Proceso que impacta
                                                            {
                                                                responsivePriority: 6,
                                                                targets: 7,
                                                            }, // Descripcion
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 8,
                                                            }, // Acciones
                                                        ],
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "estatus_valor",
                                                            title: "Estatus",
                                                            className:
                                                                "all col-semaforo dtr-control dt-control",
                                                            orderable: true,
                                                            width: "36px",
                                                            defaultContent: "",
                                                            render: (
                                                                _d: any,
                                                                type: string
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? _d ?? 99
                                                                    : "",
                                                            createdCell: (
                                                                td: any,
                                                                _cd: any,
                                                                rowData: any
                                                            ) => {
                                                                const c =
                                                                    rowData.color ||
                                                                    "#eee";
                                                                (
                                                                    td as HTMLElement
                                                                ).style.setProperty(
                                                                    "--semaforo",
                                                                    c
                                                                );
                                                                (
                                                                    td as HTMLElement
                                                                ).style.setProperty(
                                                                    "background-color",
                                                                    c,
                                                                    "important"
                                                                );
                                                                td.setAttribute(
                                                                    "title",
                                                                    getStatusLabel(
                                                                        Number(
                                                                            rowData.estatus_valor
                                                                        )
                                                                    )
                                                                );
                                                                td.setAttribute(
                                                                    "aria-label",
                                                                    getStatusLabel(
                                                                        Number(
                                                                            rowData.estatus_valor
                                                                        )
                                                                    )
                                                                );
                                                            },
                                                        },
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de ingreso",
                                                            render: (
                                                                _d: any,
                                                                type: string,
                                                                row: any
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? row.f_ingreso_raw
                                                                    : is1600DownRef.current
                                                                    ? fechaCorta(
                                                                          row.f_ingreso_raw
                                                                      )
                                                                    : row.f_ingreso,
                                                            createdCell: (
                                                                td: any,
                                                                _cd: any,
                                                                rowData: any
                                                            ) => {
                                                                const label =
                                                                    rowData?.vence_real
                                                                        ? `Fecha de vencimiento: ${formatVence(
                                                                              rowData.vence_real
                                                                          )}`
                                                                        : "Fecha de vencimiento: —";
                                                                td.setAttribute(
                                                                    "title",
                                                                    label
                                                                );
                                                                td.setAttribute(
                                                                    "aria-label",
                                                                    label
                                                                );
                                                            },
                                                        },
                                                        {
                                                            data: "ingreso",
                                                            title: "Tipo de ingreso",
                                                            className:
                                                                "text-wrap",
                                                        },
                                                        {
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                            className:
                                                                "text-nowrap",
                                                        },
                                                        {
                                                            data: "des",
                                                            title: "Unidad Académica o Dependencia",
                                                            className:
                                                                "text-wrap",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área responsable",
                                                            className:
                                                                "text-nowrap",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Proceso que impacta",
                                                            className:
                                                                "text-nowrap",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Descripción",
                                                            className:
                                                                "text-wrap",
                                                            render: (
                                                                d: any,
                                                                t: string
                                                            ) =>
                                                                t ===
                                                                    "display" ||
                                                                t === "filter"
                                                                    ? `<div class="texto-justificable no-break-words">${(
                                                                          d ??
                                                                          ""
                                                                      ).toString()}</div>`
                                                                    : d,
                                                        },
                                                        {
                                                            data: null,
                                                            title: "Acciones",
                                                            orderable: false,
                                                            searchable: false,
                                                            className:
                                                                "all dt-acciones text-center text-nowrap",
                                                        },
                                                    ]}
                                                    slots={{
                                                        8: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <>
                                                                <div
                                                                    className="btns-acciones"
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    <Button
                                                                        className="btn-icon"
                                                                        variant="warning"
                                                                        title="Editar oficio"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            visitWithScroll(
                                                                                route(
                                                                                    "oficios.modificaOficio",
                                                                                    {
                                                                                        id: row.id,
                                                                                    }
                                                                                )
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fe fe-edit"></i>
                                                                    </Button>

                                                                    <Button
                                                                        className="btn-icon"
                                                                        variant="success"
                                                                        title="Ver línea de tiempo del oficio"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    idOfico:
                                                                                        row.id,
                                                                                }
                                                                            );
                                                                            setShowLinea(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-history"></i>
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        ),
                                                    }}
                                                />
                                            </Col>
                                        </Tab>

                                        {/* ================ HISTÓRICO ================ */}
                                        <Tab eventKey="tab2" title="Histórico">
                                            <Col md={12}>
                                                <div className="d-grid gap-2 mb-2">
                                                    <FiltroEstatusPills
                                                        value={filtroHistorico}
                                                        onChange={(v) => {
                                                            setFiltroHistorico(
                                                                v
                                                            );
                                                            filtroTabla(
                                                                v,
                                                                "historico_vd"
                                                            );
                                                        }}
                                                        variante="historico"
                                                    />
                                                    <div className="d-flex justify-content-end">
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={() => {
                                                                const t = (
                                                                    jQuery as any
                                                                )(
                                                                    "#historico-table"
                                                                ).DataTable();
                                                                const rowsApi =
                                                                    t.rows({
                                                                        search: "applied",
                                                                        order: "applied",
                                                                    });
                                                                const dataArr =
                                                                    rowsApi
                                                                        .data()
                                                                        .toArray() as any[];
                                                                (
                                                                    window as any
                                                                ).__DT_EXPORT_ACTIVOS__ =
                                                                    {
                                                                        colors: dataArr.map(
                                                                            (
                                                                                r
                                                                            ) =>
                                                                                String(
                                                                                    r?.color ??
                                                                                        "#ffffff"
                                                                                )
                                                                        ),
                                                                        labels: dataArr.map(
                                                                            (
                                                                                r
                                                                            ) =>
                                                                                excelStatusLabel(
                                                                                    r?.estatus_valor
                                                                                )
                                                                        ),
                                                                        count: dataArr.length,
                                                                    } as any;
                                                                t.button(
                                                                    ".buttons-excel"
                                                                ).trigger();
                                                            }}
                                                        >
                                                            Exportar a Excel
                                                        </button>
                                                    </div>
                                                </div>

                                                <DataTable
                                                    id="historico-table"
                                                    data={historico}
                                                    className={tableClass}
                                                    options={{
                                                        ...dtStateSave(
                                                            "dt:vd:historico"
                                                        ),
                                                        ...baseDtOptions,
                                                        responsive: {
                                                            ...baseDtOptions.responsive,
                                                            details: {
                                                                ...(
                                                                    baseDtOptions as any
                                                                ).responsive
                                                                    .details,
                                                                renderer:
                                                                    makeDetailsRenderer(
                                                                        [
                                                                            "Área",
                                                                            "Proceso",
                                                                            "Breve descripción",
                                                                        ]
                                                                    ),
                                                            },
                                                        },
                                                        autoWidth: false,
                                                        order: [[1, "desc"]],
                                                        lengthMenu: [
                                                            [25, 50, 100],
                                                            [25, 50, 100],
                                                        ],
                                                        pageLength: 25,
                                                        buttons: [
                                                            {
                                                                extend: "excelHtml5",
                                                                text: "Exportar a Excel",
                                                                exportOptions: {
                                                                    modifier: {
                                                                        search: "applied",
                                                                        order: "applied",
                                                                    },
                                                                    columns: [
                                                                        1, 2, 3,
                                                                        4, 5,
                                                                    ], // omite semáforo y acciones
                                                                },
                                                                customize:
                                                                    function (
                                                                        xlsx: any
                                                                    ) {
                                                                        const $$ =
                                                                            (
                                                                                window as any
                                                                            )
                                                                                .jQuery ||
                                                                            (
                                                                                window as any
                                                                            ).$;
                                                                        const sheet =
                                                                            xlsx
                                                                                .xl
                                                                                .worksheets[
                                                                                "sheet1.xml"
                                                                            ];
                                                                        const dt =
                                                                            (
                                                                                $(
                                                                                    "#historico-table"
                                                                                ) as any
                                                                            ).DataTable();
                                                                        const rows =
                                                                            dt
                                                                                .rows(
                                                                                    {
                                                                                        search: "applied",
                                                                                        order: "applied",
                                                                                    }
                                                                                )
                                                                                .data()
                                                                                .toArray() as any[];

                                                                        $$(
                                                                            'row c[r^="A"]',
                                                                            sheet
                                                                        ).each(
                                                                            function (
                                                                                this: Element
                                                                            ) {
                                                                                const r =
                                                                                    parseInt(
                                                                                        (
                                                                                            ($$(
                                                                                                this
                                                                                            ).attr(
                                                                                                "r"
                                                                                            ) as string) ||
                                                                                            "A0"
                                                                                        ).substring(
                                                                                            1
                                                                                        ),
                                                                                        10
                                                                                    );
                                                                                if (
                                                                                    r !==
                                                                                    1
                                                                                )
                                                                                    $$(
                                                                                        this
                                                                                    ).remove();
                                                                            }
                                                                        );
                                                                        const headerStyle =
                                                                            $$(
                                                                                'row[r="2"] c[r="B2"]',
                                                                                sheet
                                                                            ).attr(
                                                                                "s"
                                                                            ) ||
                                                                            "0";
                                                                        $$(
                                                                            'row[r="2"]',
                                                                            sheet
                                                                        ).prepend(
                                                                            `<c r="A2" t="inlineStr" s="${headerStyle}"><is><t>Estatus</t></is></c>`
                                                                        );

                                                                        const styleCache: Record<
                                                                            string,
                                                                            number
                                                                        > = {};
                                                                        const ensureFillStyle =
                                                                            (
                                                                                argb: string
                                                                            ): number => {
                                                                                if (
                                                                                    styleCache[
                                                                                        argb
                                                                                    ]
                                                                                )
                                                                                    return styleCache[
                                                                                        argb
                                                                                    ];
                                                                                const styles =
                                                                                    xlsx
                                                                                        .xl[
                                                                                        "styles.xml"
                                                                                    ];
                                                                                const $s =
                                                                                    $$(
                                                                                        styles
                                                                                    );
                                                                                const $fills =
                                                                                    $s.find(
                                                                                        "fills"
                                                                                    );
                                                                                const $cellXfs =
                                                                                    $s.find(
                                                                                        "cellXfs"
                                                                                    );
                                                                                const fillsCount =
                                                                                    parseInt(
                                                                                        $fills.attr(
                                                                                            "count"
                                                                                        ) ||
                                                                                            "0",
                                                                                        10
                                                                                    );
                                                                                $fills.append(
                                                                                    `<fill><patternFill patternType=\"solid\"><fgColor rgb=\"${argb}\"/><bgColor indexed=\"64\"/></patternFill></fill>`
                                                                                );
                                                                                $fills.attr(
                                                                                    "count",
                                                                                    String(
                                                                                        fillsCount +
                                                                                            1
                                                                                    )
                                                                                );
                                                                                const xfsCount =
                                                                                    parseInt(
                                                                                        $cellXfs.attr(
                                                                                            "count"
                                                                                        ) ||
                                                                                            "0",
                                                                                        10
                                                                                    );
                                                                                const xfId =
                                                                                    xfsCount;
                                                                                $cellXfs.append(
                                                                                    `<xf numFmtId=\"0\" fontId=\"0\" fillId=\"${fillsCount}\" borderId=\"0\" xfId=\"0\" applyFill=\"1\"/>`
                                                                                );
                                                                                $cellXfs.attr(
                                                                                    "count",
                                                                                    String(
                                                                                        xfsCount +
                                                                                            1
                                                                                    )
                                                                                );
                                                                                styleCache[
                                                                                    argb
                                                                                ] =
                                                                                    xfId;
                                                                                return xfId;
                                                                            };

                                                                        const esc =
                                                                            (
                                                                                s: string
                                                                            ) =>
                                                                                (
                                                                                    s ||
                                                                                    ""
                                                                                )
                                                                                    .replace(
                                                                                        /&/g,
                                                                                        "&amp;"
                                                                                    )
                                                                                    .replace(
                                                                                        /</g,
                                                                                        "&lt;"
                                                                                    )
                                                                                    .replace(
                                                                                        />/g,
                                                                                        "&gt;"
                                                                                    );

                                                                        rows.forEach(
                                                                            (
                                                                                r,
                                                                                i
                                                                            ) => {
                                                                                const n =
                                                                                    3 +
                                                                                    i;
                                                                                const {
                                                                                    txt,
                                                                                    argb,
                                                                                } =
                                                                                    excelStatusMap(
                                                                                        r?.estatus_valor
                                                                                    );
                                                                                const sIdx =
                                                                                    ensureFillStyle(
                                                                                        argb
                                                                                    );
                                                                                $$(
                                                                                    `row[r="${n}"]`,
                                                                                    sheet
                                                                                ).prepend(
                                                                                    `<c r="A${n}" t="inlineStr" s="${sIdx}"><is><t>${esc(
                                                                                        txt
                                                                                    )}</t></is></c>`
                                                                                );
                                                                            }
                                                                        );
                                                                    },
                                                            },
                                                        ],
                                                        columnDefs: [
                                                            ...(
                                                                baseDtOptions as any
                                                            ).columnDefs,
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 0,
                                                            }, // Estatus
                                                            {
                                                                responsivePriority: 2,
                                                                targets: 1,
                                                            }, // Fecha
                                                            {
                                                                responsivePriority: 3,
                                                                targets: 2,
                                                            }, // No Oficio/Folio

                                                            {
                                                                responsivePriority: 4,
                                                                targets: 3,
                                                            }, // Área
                                                            {
                                                                responsivePriority: 5,
                                                                targets: 4,
                                                            }, // Proceso
                                                            {
                                                                responsivePriority: 4,
                                                                targets: 5,
                                                            }, // Breve descripción
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 6,
                                                            }, // Acciones
                                                        ],
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "estatus_valor",
                                                            title: "Estatus",
                                                            className:
                                                                "all col-semaforo dtr-control dt-control",
                                                            orderable: true,
                                                            width: "36px",
                                                            defaultContent: "",
                                                            render: (
                                                                _d: any,
                                                                type: string
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? _d ?? 99
                                                                    : "",
                                                            createdCell: (
                                                                td: any,
                                                                _cd: any,
                                                                rowData: any
                                                            ) => {
                                                                const c =
                                                                    rowData.color ||
                                                                    "#eee";
                                                                (
                                                                    td as HTMLElement
                                                                ).style.setProperty(
                                                                    "--semaforo",
                                                                    c
                                                                );
                                                                (
                                                                    td as HTMLElement
                                                                ).style.setProperty(
                                                                    "background-color",
                                                                    c,
                                                                    "important"
                                                                );
                                                                td.setAttribute(
                                                                    "title",
                                                                    getStatusLabel(
                                                                        Number(
                                                                            rowData.estatus_valor
                                                                        )
                                                                    )
                                                                );
                                                                td.setAttribute(
                                                                    "aria-label",
                                                                    getStatusLabel(
                                                                        Number(
                                                                            rowData.estatus_valor
                                                                        )
                                                                    )
                                                                );
                                                            },
                                                        },
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de ingreso",
                                                            render: (
                                                                _d: any,
                                                                type: string,
                                                                row: any
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? row.f_ingreso_raw
                                                                    : is1600DownRef.current
                                                                    ? fechaCorta(
                                                                          row.f_ingreso_raw
                                                                      )
                                                                    : row.f_ingreso,
                                                        },
                                                        {
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                            className:
                                                                "text-nowrap",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área responsable",
                                                            className:
                                                                "text-nowrap",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Proceso",
                                                            className:
                                                                "text-nowrap",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Breve descripción",
                                                            className:
                                                                "text-wrap",
                                                            render: (
                                                                d: any,
                                                                t: string
                                                            ) =>
                                                                t ===
                                                                    "display" ||
                                                                t === "filter"
                                                                    ? `<div class="texto-justificable no-break-words">${(
                                                                          d ??
                                                                          ""
                                                                      ).toString()}</div>`
                                                                    : d,
                                                        },
                                                        {
                                                            data: null,
                                                            title: "Acciones",
                                                            orderable: false,
                                                            searchable: false,
                                                            className:
                                                                "dt-acciones text-center text-nowrap",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Descripción",
                                                            visible: false,
                                                            searchable: true,
                                                        },
                                                        {
                                                            data: "asunto",
                                                            title: "Respuesta",
                                                            visible: false,
                                                            searchable: true,
                                                        },
                                                    ]}
                                                    slots={{
                                                        6: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div
                                                                className="btns-acciones"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                <div
                                                                    className="btns-acciones"
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    {/* Confirmación de recibido */}
                                                                    <Button
                                                                        type="button"
                                                                        className="btn-icon"
                                                                        variant="danger"
                                                                        title="Ver confirmación de recibido"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    urlPdf: row.archivo_respuesta,
                                                                                    extension:
                                                                                        row.extension,
                                                                                }
                                                                            );
                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-file-pdf-o" />
                                                                    </Button>

                                                                    {/* Respuesta al oficio */}
                                                                    <Button
                                                                        type="button"
                                                                        className="btn-icon"
                                                                        variant="danger"
                                                                        title="Ver respuesta al oficio"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    urlPdf: row.oficio_final,
                                                                                    extension:
                                                                                        "pdf",
                                                                                }
                                                                            );
                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-file-pdf-o" />
                                                                    </Button>

                                                                    {/* PDF del oficio */}
                                                                    <Button
                                                                        type="button"
                                                                        className="btn-icon"
                                                                        variant="danger"
                                                                        title="Ver PDF del oficio"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    urlPdf: row.archivo,
                                                                                    extension:
                                                                                        "pdf",
                                                                                }
                                                                            );
                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-eye" />
                                                                    </Button>

                                                                    {/* Línea de tiempo */}
                                                                    <Button
                                                                        type="button"
                                                                        className="btn-icon"
                                                                        variant="success"
                                                                        title="Ver línea de tiempo del oficio"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    idOfico:
                                                                                        row.id,
                                                                                }
                                                                            );
                                                                            setShowLinea(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-history" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ),
                                                    }}
                                                />
                                            </Col>
                                        </Tab>

                                        {/* ================ INFORMATIVOS ================ */}
                                        <Tab
                                            eventKey="tab3"
                                            title="Informativos"
                                        >
                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
                                                <DataTable
                                                    id="informativos-table"
                                                    data={informativos}
                                                    className={tableClass}
                                                    options={{
                                                        ...dtStateSave(
                                                            "dt:vd:informativos"
                                                        ),
                                                        language,
                                                        responsive: {
                                                            details: {
                                                                type: "inline",
                                                                target: "td.col-semaforo.dtr-control",
                                                                renderer:
                                                                    makeDetailsRenderer(
                                                                        [
                                                                            "Fecha de creación",
                                                                            "No. Oficio / Folio",
                                                                            "Breve descripción",
                                                                        ]
                                                                    ),
                                                            },
                                                        },
                                                        autoWidth: false,
                                                        order: [[0, "desc"]],
                                                        lengthMenu: [
                                                            [25, 50, 100],
                                                            [25, 50, 100],
                                                        ],
                                                        pageLength: 25,
                                                        columnDefs: [
                                                            ...(
                                                                baseDtOptions as any
                                                            ).columnDefs,
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 0,
                                                            }, // Fecha de creación
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 1,
                                                            }, //  No Oficio/Folio
                                                            {
                                                                responsivePriority: 4,
                                                                targets: 2,
                                                            }, // Descripcion

                                                            {
                                                                responsivePriority: 0,
                                                                targets: 3,
                                                            }, // Acciones
                                                        ],
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de creación",
                                                            render: (
                                                                _d: any,
                                                                type: string,
                                                                row: any
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? row.f_ingreso_raw
                                                                    : is1600DownRef.current
                                                                    ? fechaCorta(
                                                                          row.f_ingreso_raw
                                                                      )
                                                                    : row.f_ingreso,
                                                        },
                                                        {
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                            className:
                                                                "text-nowrap",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Breve descripción",
                                                            className:
                                                                "text-wrap",
                                                            render: (
                                                                d: any,
                                                                t: string
                                                            ) =>
                                                                t ===
                                                                    "display" ||
                                                                t === "filter"
                                                                    ? `<div class="texto-justificable no-break-words">${(
                                                                          d ??
                                                                          ""
                                                                      ).toString()}</div>`
                                                                    : d,
                                                        },
                                                        {
                                                            data: null,
                                                            title: "Acciones",
                                                            orderable: false,
                                                            searchable: false,
                                                            className:
                                                                "dt-acciones text-center text-nowrap",
                                                        },
                                                    ]}
                                                    slots={{
                                                        3: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div
                                                                className="btns-acciones"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                <Button
                                                                    type="button"
                                                                    className="btn-icon"
                                                                    variant="danger"
                                                                    title="Ver PDF del oficio"
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setVariables(
                                                                            (
                                                                                v
                                                                            ) => ({
                                                                                ...v,
                                                                                urlPdf: row.archivo,
                                                                                extension:
                                                                                    "pdf",
                                                                            })
                                                                        );
                                                                        setShow(
                                                                            true
                                                                        );
                                                                    }}
                                                                    aria-label="Ver PDF del oficio"
                                                                >
                                                                    <i className="fa fa-eye" />
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                />
                                            </Col>
                                        </Tab>

                                        {/* ============ OFICIOS VD HISTÓRICO ============ */}
                                        <Tab
                                            eventKey="tab5"
                                            title="Oficios VD Histórico"
                                        >
                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
                                                <div className="mb-3 d-flex justify-content-end">
                                                    <button
                                                        className="btn btn-success"
                                                        onClick={() => {
                                                            const t =
                                                                $(
                                                                    "#historicoVd-table"
                                                                ).DataTable();
                                                            const rowsApi =
                                                                t.rows({
                                                                    search: "applied",
                                                                    order: "applied",
                                                                });
                                                            const dataArr: any[] =
                                                                rowsApi
                                                                    .data()
                                                                    .toArray();
                                                            (
                                                                window as any
                                                            ).__DT_EXPORT_ACTIVOS__ =
                                                                {
                                                                    colors: dataArr.map(
                                                                        (r) =>
                                                                            String(
                                                                                r?.color ??
                                                                                    "#ffffff"
                                                                            )
                                                                    ),
                                                                    labels: dataArr.map(
                                                                        (r) =>
                                                                            getStatusLabel(
                                                                                Number(
                                                                                    r?.estatus_valor ??
                                                                                        99
                                                                                )
                                                                            )
                                                                    ),
                                                                };
                                                            t.button(
                                                                ".buttons-excel"
                                                            ).trigger();
                                                        }}
                                                    >
                                                        Exportar a Excel
                                                    </button>
                                                </div>

                                                <DataTable
                                                    id="historicoVd-table"
                                                    data={nuevoHistorico}
                                                    className={tableClass}
                                                    options={{
                                                        ...dtStateSave(
                                                            "dt:vd:vdhist"
                                                        ),
                                                        ...baseDtOptions,
                                                        responsive: {
                                                            ...baseDtOptions.responsive,
                                                            details: {
                                                                ...(
                                                                    baseDtOptions as any
                                                                ).responsive
                                                                    .details,
                                                                renderer:
                                                                    makeDetailsRenderer(
                                                                        [
                                                                            "Fecha de creación",
                                                                            "Num Folio/Oficio",
                                                                            "Área",
                                                                            "Destinatario",
                                                                        ]
                                                                    ),
                                                            },
                                                        },
                                                        autoWidth: false,

                                                        order: [[0, "desc"]],
                                                        lengthMenu: [
                                                            [25, 50, 100],
                                                            [25, 50, 100],
                                                        ],
                                                        pageLength: 25,
                                                        buttons: [
                                                            {
                                                                extend: "excelHtml5",
                                                                text: "Exportar a Excel",
                                                                exportOptions: {
                                                                    modifier: {
                                                                        search: "applied",
                                                                        order: "applied",
                                                                    },
                                                                    columns: [
                                                                        0, 1, 2,
                                                                        3,
                                                                    ], // omite acciones
                                                                },
                                                            },
                                                        ],
                                                        columnDefs: [
                                                            ...(
                                                                baseDtOptions as any
                                                            ).columnDefs,
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 0,
                                                            }, // Fecha de creación
                                                            {
                                                                responsivePriority: 1,
                                                                targets: 1,
                                                            }, // Num Folio/Oficio
                                                            {
                                                                responsivePriority: 2,
                                                                targets: 2,
                                                            }, // Área

                                                            {
                                                                responsivePriority: 3,
                                                                targets: 3,
                                                            }, // Destinatario
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 4,
                                                            }, // Acciones
                                                        ],
                                                    }}
                                                    columns={[
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de creación",
                                                            render: (
                                                                _d: any,
                                                                type: string,
                                                                row: any
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? row.f_ingreso_raw
                                                                    : is1600DownRef.current
                                                                    ? fechaCorta(
                                                                          row.f_ingreso_raw
                                                                      )
                                                                    : row.f_ingreso,
                                                        },
                                                        {
                                                            data: "oficio_respuesta",
                                                            title: "Num Folio/Oficio",
                                                            className:
                                                                "text-nowrap",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área",
                                                            className:
                                                                "text-wrap",
                                                        },
                                                        {
                                                            data: "nombre_desti",
                                                            title: "Destinatario",
                                                            className:
                                                                "text-wrap",
                                                        },
                                                        {
                                                            data: null,
                                                            title: "Acciones",
                                                            orderable: false,
                                                            searchable: false,
                                                            className:
                                                                "dt-acciones text-center text-nowrap",
                                                        },
                                                        {
                                                            data: "respuesta",
                                                            title: "Respuesta",
                                                            visible: false,
                                                            searchable: true,
                                                        },
                                                    ]}
                                                    slots={{
                                                        4: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div
                                                                className="btns-acciones"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                {/* Ver confirmación de recibido (PDF) */}
                                                                {row.masivo ===
                                                                1 ? (
                                                                    <Button
                                                                        type="button"
                                                                        className="btn-icon"
                                                                        variant="danger"
                                                                        title="Ver confirmación de recibido"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    urlPdf: row.archivo_respuesta,
                                                                                    extension:
                                                                                        row.extension,
                                                                                }
                                                                            );
                                                                            setShow(
                                                                                true
                                                                            );
                                                                        }}
                                                                        aria-label="Ver confirmación de recibido"
                                                                    >
                                                                        <i className="fa fa-file-pdf-o" />
                                                                    </Button>
                                                                ) : (
                                                                    // Confirmaciones de recibido (navegación)
                                                                    <Button
                                                                        type="button"
                                                                        className="btn-icon"
                                                                        variant="warning"
                                                                        title="Confirmaciones de recibido"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            visitWithScroll(
                                                                                route(
                                                                                    "oficios.confirmaRecibidosNuevos",
                                                                                    {
                                                                                        id: row.id,
                                                                                    }
                                                                                )
                                                                            );
                                                                        }}
                                                                        aria-label="Confirmaciones de recibido"
                                                                    >
                                                                        <i className="fa fa-handshake-o" />
                                                                    </Button>
                                                                )}

                                                                {/* Ver detalle del oficio (navegación) */}
                                                                <Button
                                                                    type="button"
                                                                    className="btn-icon"
                                                                    variant="danger"
                                                                    title="Ver detalle del oficio"
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        visitWithScroll(
                                                                            route(
                                                                                "oficios.detalleNuevo",
                                                                                {
                                                                                    id: row.id,
                                                                                }
                                                                            )
                                                                        );
                                                                    }}
                                                                    aria-label="Ver detalle del oficio"
                                                                >
                                                                    <i className="fa fa-eye" />
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

                <LineaTiempo
                    showLinea={showLinea}
                    setShowLinea={setShowLinea}
                    id={variables.idOfico}
                />
                <VerPdf
                    urlPdf={variables.urlPdf}
                    show={show}
                    tipo={variables.extension}
                    setShow={setShow}
                />
            </Fragment>
        </AppLayout>
    );
}
