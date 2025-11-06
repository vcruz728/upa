import Buttons from "datatables.net-buttons-bs5";

import "datatables.net-buttons-bs5/css/buttons.bootstrap5.css";

import AppLayout from "@/Layouts/app";
import {
    Head,
    Link,
    router,
    useForm,
    usePage,
    useRemember,
} from "@inertiajs/react";
import { useState, Fragment, useEffect, useRef, FormEventHandler } from "react";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import {
    Card,
    Row,
    Col,
    Button,
    Modal,
    ModalHeader,
    ModalTitle,
    ModalBody,
    ModalFooter,
    Form,
    Tabs,
    Tab,
} from "react-bootstrap";
import InputError from "../InputError";
import toast from "react-hot-toast";
import VerPdf from "@/types/VerPdf";
import LineaTiempo from "@/types/LineaTiempo";

import DataTable from "datatables.net-react";
import DataTablesCore from "datatables.net-bs5";
import Responsive from "datatables.net-responsive-bs5";

// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";

// Importa los botones de DataTables
import "datatables.net-buttons-bs5";
import "datatables.net-buttons/js/buttons.html5.js";

import "../../../css/botones.css";

import { getStatusLabel } from "../../../js/utils/status";
import FiltroEstatusPills from "@/Components/FiltroEstatusPills";
import jQuery from "jquery";
import JSZip from "jszip";
(window as any).JSZip = JSZip;
(window as any).jQuery = jQuery;
(window as any).$ = jQuery;
import "datatables.net-buttons/js/buttons.html5.js";

// Renderiza el detalle con secciones bonitas
const makeDetailsRenderer =
    (wantedTitles: string[]) =>
    (_api: any, _rowIdx: number, columns: any[]) => {
        // Solo columnas ocultas y que nos interesan
        const rows = columns.filter(
            (c) => c.hidden && wantedTitles.includes(String(c.title).trim())
        );

        if (!rows.length) return false;

        // Estructura con secciones
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
            // c.data ya viene con el HTML de la celda (incluye tu .texto-justificable)
            value.innerHTML =
                c.data && String(c.data).trim() !== "" ? c.data : "—";

            sec.appendChild(label);
            sec.appendChild(value);
            wrap.appendChild(sec);
        });

        return wrap; // puede ser string/Node/jQuery; aquí devolvemos un Node
    };

// === scroll memory per-ruta ===
import {
    saveScrollForCurrentPath,
    restoreScrollForCurrentPath,
    enableManualRestoration,
    disableManualRestoration,
} from "../../../js/utils/scrollMemory";

DataTable.use(DataTablesCore);
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

// ==== helpers TS para export ====
type DtExportPack = { colors: string[]; labels: string[] };

declare global {
    interface Window {
        JSZip?: any;
        __DT_EXPORT_ACTIVOS__?: DtExportPack;
        __DT_EXPORT_HIST__?: DtExportPack;
        __DT_EXPORT_VD__?: DtExportPack;
        __DT_EXPORT_VD_HIST__?: DtExportPack;
        $?: any;
        jQuery?: any;
    }
}

const LIST_PATH = "/oficios/respuestas"; // ruta del listado para limitar la restauración

type FormIn = {
    id: number;
    archivo: File | null;
    tipo: string;
};

const OficiosRespuestas = ({
    status,
    oficios,
    nuevos,
}: {
    status?: string;
    oficios: [];
    nuevos: [];
}) => {
    const user = usePage().props.auth.user;
    const fileInputRef = useRef<HTMLInputElement>(null);
    //    const [show, setShowUpload] = useState(false);
    //  const [showDos, setShowUpload] = useState(false);
    const [showPdf, setShowPdf] = useState(false); // visor PDF (nuevo)
    const [showUpload, setShowUpload] = useState(false); // subir confirmación
    const [showLinea, setShowLinea] = useState(false);
    const [variables, setVariables] = useState({
        urlPdf: "",
        extension: "",
        idOfico: 0,
    });
    // arriba, junto a otros refs
    const lastScrollYRef = useRef(0);

    const [activos, setActivos] = useState<any[]>([]);
    const [historico, setHistorico] = useState<any[]>([]);
    const [informativos, setInformativos] = useState<any[]>([]);
    const [nuevoOfi, setNuevoOfi] = useState<any[]>([]);
    const [nuevoHistorico, setNuevoHistorico] = useState<any[]>([]);

    // helpers que llaman tu endpoint actual:
    const onFiltroActivos = (v: string) => {
        setFiltroActivos(v);
        filtroTabla(v, "activos");
    };
    const onFiltroHistorico = (v: string) => {
        setFiltroHistorico(v);
        filtroTabla(v, "historico_vd");
    };

    useEffect(() => {
        setActivos(
            (oficios || [])
                .filter(
                    (item: any) =>
                        item.archivo_respuesta === null && item.id_area !== "1"
                )
                .map((file: any) => ({
                    ...file,
                }))
        );
        setHistorico(
            (oficios || [])
                .filter(
                    (item: any) =>
                        item.archivo_respuesta !== null && item.id_area !== "1"
                )
                .map((file: any) => ({
                    ...file,
                }))
        );

        setInformativos(
            (oficios || [])
                .filter((item: any) => item.id_area === "1")
                .map((file: any) => ({
                    ...file,
                }))
        );
    }, [oficios]);

    useEffect(() => {
        const id = "oficios-styles";
        if (document.getElementById(id)) return;

        const style = document.createElement("style");
        style.id = id;
        style.textContent = `
       .oficios-scope { 
         --mo-hover: rgba(0,0,0,.04);
         --mo-striped: rgba(0,0,0,.02);
       }
       .oficios-scope .table-hover tbody tr:hover > * { background-color: var(--mo-hover) !important; }
       .oficios-scope .table-striped tbody tr:nth-of-type(odd) > * { background-color: var(--mo-striped) !important; }
       .oficios-scope td.col-semaforo,
       .oficios-scope tr:hover td.col-semaforo,
       .oficios-scope tr.table-active td.col-semaforo,
       .oficios-scope tr.selected td.col-semaforo { background-color: var(--semaforo, #eee) !important; background-image: none !important; }
   html { scroll-behavior: auto !important; }
    /* Fuerza ancho de la columna Estatus en desktop (evita que colapse) */
    .oficios-scope #activos-table thead th:first-child,
    .oficios-scope #historico-table thead th:first-child{
      width:36px; min-width:36px;
    }
    .oficios-scope td.col-semaforo{
      width:36px !important; min-width:36px !important; max-width:36px !important;
    }
      /* ====== Detalle Responsive bonito ====== */
.oficios-scope .mo-child{
  padding: 12px 10px;
  background: #fff;
}

.oficios-scope .mo-row{
  padding: 12px 6px;
  border-top: 1px solid #eee;
}

.oficios-scope .mo-row:first-child{
  border-top: 0;
}

.oficios-scope .mo-label{
  display: block;
  font-weight: 700;
  color: #475569;         /* slate-600 */
  text-align: center;     /* etiqueta centrada como en tu imagen */
  margin-bottom: 6px;
}

.oficios-scope .mo-value{
   text-align: center;     /* contenido normal a la izquierda */
  word-break: break-word;
}

/* Asegura el justificado cuando tu celda llevaba .texto-justificable */
.oficios-scope .mo-value .texto-justificable{
  text-align: justify;
}

/* ====== Triangulito sólo cuando la tabla está colapsada ====== */
.oficios-scope td.col-semaforo.dtr-control{ cursor:pointer; position:relative; }

/* caret centrado y grande */
.oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr >
td.col-semaforo.dtr-control::before{
  content:"▸";
  position:absolute;
  left:50%; top:50%;
  transform:translate(-50%,-50%);
  font-size:18px;
  color:#444;
  border:0; background:transparent; box-shadow:none;
}

/* cuando está abierto */
.oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr.parent >
td.col-semaforo.dtr-control::before{
  content:"▾";
}

/* Ocultar el caret y quitar el padding extra en pantallas grandes */
@media (min-width: 1200px){
  .oficios-scope table.dataTable > tbody > tr >
  td.col-semaforo.dtr-control::before{ display:none; }
  .oficios-scope td.col-semaforo{ padding-left: 0 !important; }
}

       `;
        document.head.appendChild(style);
        return () => {
            style.remove();
        };
    }, []);

    // === anclas por tab ===
    const ANCHOR_KEY = (tab: string, userId: string | number | undefined) =>
        `anchor:${LIST_PATH}:${tab}:${userId ?? "anon"}`;

    const setAnchor = (tab: string, rowId: string | number) =>
        localStorage.setItem(ANCHOR_KEY(tab, user?.id), String(rowId));

    const popAnchor = (tab: string): string | null => {
        const k = ANCHOR_KEY(tab, user?.id);
        const v = localStorage.getItem(k);
        if (v) localStorage.removeItem(k);
        return v;
    };

    const peekAnchor = (tab: string): string | null => {
        const k = ANCHOR_KEY(tab, user?.id);
        return localStorage.getItem(k);
    };
    const consumeAnchor = (tab: string) => {
        localStorage.removeItem(ANCHOR_KEY(tab, user?.id));
    };

    // intenta hacer scroll al ancla si existe
    const scrollToAnchorIfAny = (tab: string) => {
        const rid = popAnchor(tab);
        if (!rid) return false;
        const el = document.getElementById(`row-${tab}-${rid}`);
        if (!el) return false;
        // sin animación
        (document.documentElement as any).style.scrollBehavior = "auto";
        el.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "auto",
        });
        // restablece lo que hubiera
        (document.documentElement as any).style.scrollBehavior = "";
        return true;
    };

    function tryScrollInDT(tab: string, tableId: string): boolean {
        const rid = peekAnchor(tab);
        if (!rid) return false;

        const $ = (window as any).jQuery || (window as any).$;
        const dt = $?.fn?.dataTable?.isDataTable?.(`#${tableId}`)
            ? $(`#${tableId}`).DataTable()
            : null;
        if (!dt) return false;

        const idxs = dt
            .rows({ search: "applied", order: "applied" })
            .indexes()
            .toArray();
        const targetIdx = idxs.find(
            (idx: number) => String(dt.row(idx).data()?.id) === String(rid)
        );
        if (targetIdx == null) return false;

        const pageLen = dt.page.len();
        const pos = idxs.indexOf(targetIdx);
        const page = Math.max(0, Math.floor(pos / pageLen));

        dt.one("draw", () => {
            const el = document.getElementById(`row-${tab}-${rid}`);
            if (el) {
                (document.documentElement as any).style.scrollBehavior = "auto";
                el.scrollIntoView({ block: "center", behavior: "auto" });
                (document.documentElement as any).style.scrollBehavior = "";
                consumeAnchor(tab);
            }
        });

        dt.page(page).draw("page");
        return true;
    }

    // Bases inmutables para filtrar en cliente
    const [activosBase, setActivosBase] = useState<any[]>([]);
    const [historicoBase, setHistoricoBase] = useState<any[]>([]);

    // ===== Scroll: controlar restauración SOLO en listado =====
    const didRestoreRef = useRef(false);
    useEffect(() => {
        if (location.pathname === LIST_PATH) {
            enableManualRestoration();
            // intentos tempranos
            restoreScrollForCurrentPath();
            setTimeout(() => restoreScrollForCurrentPath(), 0);
            setTimeout(() => restoreScrollForCurrentPath(), 120);
        }
        return () => {
            if (location.pathname === LIST_PATH) disableManualRestoration();
        };
    }, []);
    // guarda scroll al irse (solo listado)
    useEffect(() => {
        if (location.pathname !== LIST_PATH) return;
        const onLeave = () => saveScrollForCurrentPath();
        window.addEventListener("pagehide", onLeave);
        return () => window.removeEventListener("pagehide", onLeave);
    }, []);

    // Guarda/recupera estado de DataTables en localStorage
    const makeKey = (name: string) => `dt:${name}:${user?.id ?? "anon"}`;
    const dtStateSave = (key: string) => ({
        stateSave: true,
        stateDuration: -1,
        stateSaveCallback: (_s: any, data: any) =>
            localStorage.setItem(key, JSON.stringify(data)),
        stateLoadCallback: (_s: any) => {
            try {
                return JSON.parse(localStorage.getItem(key) || "null");
            } catch {
                return null;
            }
        },
    });

    // Utilidad de filtrado (estatus 0 = todos)
    const filtraPorEstatus = (arr: any[], valor: string) => {
        const v = Number(valor);
        if (v === 0) return arr ?? [];
        return (arr ?? []).filter((x: any) => Number(x.estatus_valor) === v);
    };

    // UI que debemos recordar
    const [activeTab, setActiveTab] = useRemember<
        "tab1" | "tab2" | "tab3" | "tab4" | "tab5"
    >("tab1", "ui.tab");
    const [filtroActivos, setFiltroActivos] = useRemember<string>(
        "0",
        "ui.filtro.activos"
    );
    const [filtroHistorico, setFiltroHistorico] = useRemember<string>(
        "0",
        "ui.filtro.historico"
    );

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
    useEffect(() => {
        setNuevoOfi(
            (nuevos || [])
                .filter((item: any) => item.archivo_respuesta === null)
                .map((file: any) => ({ ...file }))
        );
        setNuevoHistorico(
            (nuevos || [])
                .filter((item: any) => item.archivo_respuesta !== null)
                .map((file: any) => ({ ...file }))
        );
    }, [nuevos]);

    // Construye bases cada que cambian los props
    useEffect(() => {
        const A = (oficios || [])
            .filter(
                (i: any) => i.archivo_respuesta === null && i.id_area !== "1"
            )
            .map((f: any) => ({ ...f }));
        const H = (oficios || [])
            .filter(
                (i: any) => i.archivo_respuesta !== null && i.id_area !== "1"
            )
            .map((f: any) => ({ ...f }));

        setActivosBase(A);
        setHistoricoBase(H);
    }, [oficios]);

    // Aplica filtro recordado a Activos
    useEffect(() => {
        setActivos(filtraPorEstatus(activosBase, filtroActivos));
    }, [activosBase, filtroActivos]);

    // Aplica filtro recordado a Histórico
    useEffect(() => {
        setHistorico(filtraPorEstatus(historicoBase, filtroHistorico));
    }, [historicoBase, filtroHistorico]);

    const form = useForm<FormIn>({
        id: 0,
        archivo: null,
        tipo: "",
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route("subeEvidenciaRecibido"), {
            onSuccess: clearForm,
        });
    };

    const handleChangeS = (e: any) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            form.setData("archivo", target.files[0]);
        }
    };

    const clearForm = () => {
        form.setDefaults({
            id: 0,
            archivo: null,
        });
        setShowUpload(false);
        form.reset();

        fileInputRef.current!.value = "";

        toast("Correcto: Se guardo la respuesta del oficio.", {
            style: {
                padding: "25px",
                color: "#fff",
                backgroundColor: "#29bf74",
            },
            position: "top-center",
        });
    };

    // Antes hacía fetch. Ahora filtra en memoria.
    const filtroTabla = (valor: string, tipo: "activos" | "historico_vd") => {
        if (tipo === "activos") {
            setActivos(filtraPorEstatus(activosBase, valor));
        } else {
            setHistorico(filtraPorEstatus(historicoBase, valor));
        }
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
    // Recalcular responsive al cambiar de tab
    const onTabSelect = () =>
        setTimeout(() => window.dispatchEvent(new Event("resize")), 0);

    // Debounce simple
    function debounce<T extends (...a: any[]) => void>(fn: T, wait = 120) {
        let t: any;
        return (...args: any[]) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    }

    const recalcAllDT = () => {
        const api = ((jQuery as any).fn.dataTable as any).tables({
            api: true,
            visible: true,
        });
        try {
            api.columns().adjust();
            (api as any).responsive?.recalc?.();
        } catch {
            /* noop */
        }
    };
    useEffect(() => {
        const debounced = debounce(recalcAllDT, 120);
        // antes: "shown.bs.tab shown.bs.modal"
        (jQuery as any)(document).on("shown.bs.tab", debounced);
        // recalcula al CERRAR modal, no al abrir
        (jQuery as any)(document).on("hidden.bs.modal", debounced);
        return () => {
            (jQuery as any)(document).off("shown.bs.tab", debounced);
            (jQuery as any)(document).off("hidden.bs.modal", debounced);
        };
    }, []);

    // 1) Ref con el valor actual de "md-down"
    const is1600DownRef = useRef<boolean>(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1600px)");
        const recalcAll = () => {
            is1600DownRef.current = mq.matches;
            const api = ((jQuery as any).fn.dataTable as any).tables({
                api: true,
                visible: true,
            });
            if (!api?.rows) return;
            api.rows().invalidate("data").draw(false);
            try {
                api.columns.adjust();
                (api as any).responsive?.recalc?.();
            } catch {}
        };
        const debounced = debounce(recalcAll, 120);
        mq.addEventListener?.("change", debounced);
        mq.addListener?.(debounced);
        window.addEventListener("resize", debounced);
        (window as any).visualViewport?.addEventListener?.("resize", debounced);
        let lastDpr = window.devicePixelRatio;
        const dprTimer = window.setInterval(() => {
            if (window.devicePixelRatio !== lastDpr) {
                lastDpr = window.devicePixelRatio;
                recalcAll();
            }
        }, 300);
        recalcAll();
        return () => {
            mq.removeEventListener?.("change", debounced);
            mq.removeListener?.(debounced);
            window.removeEventListener("resize", debounced);
            (window as any).visualViewport?.removeEventListener?.(
                "resize",
                debounced
            );
            clearInterval(dprTimer);
        };
    }, []);

    // ¿Vista compacta? (< 1200px)
    const [isMdDown, setIsMdDown] = useState(
        () => window.matchMedia("(max-width: 1199.98px)").matches
    );
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1199.98px)");
        const onChange = () => setIsMdDown(mq.matches);
        mq.addEventListener?.("change", onChange);
        mq.addListener?.(onChange);
        return () => {
            mq.removeEventListener?.("change", onChange);
            mq.removeListener?.(onChange);
        };
    }, []);

    useEffect(() => {
        // intenta restaurar por ancla dependiendo del tab activo
        if (activeTab === "tab2") scrollToAnchorIfAny("historico");
        // además, tu restoreScrollForCurrentPath ya corre al entrar,
        // esto solo centra exactamente el renglón.
    }, [activeTab]);
    //Activos
    useEffect(() => {
        if (activeTab !== "tab1") return;

        // varios intentos por si DT aún no está listo
        const t0 = requestAnimationFrame(() =>
            tryScrollInDT("activos", "activos-table")
        );
        const t1 = setTimeout(
            () => tryScrollInDT("activos", "activos-table"),
            120
        );
        const t2 = setTimeout(
            () => tryScrollInDT("activos", "activos-table"),
            400
        );

        // además, si la tabla se vuelve a dibujar (p. ej. por Responsive), reintenta
        const $ = (window as any).jQuery || (window as any).$;
        return () => {
            cancelAnimationFrame(t0 as any);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [activeTab, activos]);

    // VD
    useEffect(() => {
        if (activeTab !== "tab4") return;

        const t0 = requestAnimationFrame(() => tryScrollInDT("vd", "vd-table"));
        const t1 = setTimeout(() => tryScrollInDT("vd", "vd-table"), 120);
        const t2 = setTimeout(() => tryScrollInDT("vd", "vd-table"), 400);

        return () => {
            cancelAnimationFrame(t0 as any);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [activeTab, nuevoOfi]);

    // VDH
    useEffect(() => {
        if (activeTab !== "tab5") return;

        const t0 = requestAnimationFrame(() =>
            tryScrollInDT("vdh", "vd-historico-table")
        );
        const t1 = setTimeout(
            () => tryScrollInDT("vdh", "vd-historico-table"),
            120
        );
        const t2 = setTimeout(
            () => tryScrollInDT("vdh", "vd-historico-table"),
            400
        );

        return () => {
            cancelAnimationFrame(t0 as any);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [activeTab, nuevoHistorico]);

    // Congelar scroll cuando CUALQUIER modal esté abierto
    const anyModalOpen = showUpload;
    useBodyScrollLock(Boolean(anyModalOpen));

    function useBodyScrollLock(active: boolean) {
        useEffect(() => {
            if (!active) return;

            const body = document.body;
            const html = document.documentElement;

            // guarda el scroll real
            lastScrollYRef.current = window.scrollY || window.pageYOffset;

            // ancho del scroll para evitar “salto”
            const scrollbarW = window.innerWidth - html.clientWidth;

            // lock cooperativo
            body.style.position = "fixed";
            body.style.top = `-${lastScrollYRef.current}px`;
            body.style.left = "0";
            body.style.right = "0";
            body.style.width = "100%";
            body.style.overflow = "hidden";
            if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;
            html.style.overflow = "hidden";
            body.classList.add("mo-locked");

            const restore = () => {
                // unlock
                body.style.position = "";
                body.style.top = "";
                body.style.left = "";
                body.style.right = "";
                body.style.width = "";
                body.style.overflow = "";
                body.style.paddingRight = "";
                html.style.overflow = "";
                body.classList.remove("mo-locked");

                // espera a que Bootstrap termine de limpiar clases/estilos
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        window.scrollTo(0, lastScrollYRef.current || 0);
                    });
                });
            };

            // restaura DESPUÉS del hidden del modal de Bootstrap
            const onHidden = () => restore();
            (jQuery as any)(document).one("hidden.bs.modal", onHidden);

            // cleanup
            return () => {
                (jQuery as any)(document).off("hidden.bs.modal", onHidden);
                restore();
            };
        }, [active]);
    }

    /* Válvula de seguridad: limpia restos si algún modal/custom dejó el DOM bloqueado */
    useEffect(() => {
        const unlock = () => {
            document.body.classList.remove("modal-open");
            document.body.style.removeProperty("overflow");
            document.documentElement.style.removeProperty("overflow");
            document.body.style.removeProperty("position");
            document.body.style.removeProperty("top");
            document.body.style.removeProperty("left");
            document.body.style.removeProperty("right");
            document.body.style.removeProperty("width");
            document.body.style.removeProperty("padding-right");
        };
        (jQuery as any)(document).on("hidden.bs.modal", unlock);
        window.addEventListener("pageshow", unlock);
        return () => {
            (jQuery as any)(document).off("hidden.bs.modal", unlock);
            window.removeEventListener("pageshow", unlock);
        };
    }, []);

    useEffect(() => {
        const id = "oficios-flechas";
        if (document.getElementById(id)) return;
        const style = document.createElement("style");
        style.id = id;
        style.textContent = `
/* ===== Triangulito centrado, solo en modo colapsado ===== */

/* El control no necesita padding lateral */
.oficios-scope td.col-semaforo.dtr-control{
  position: relative;
  cursor: pointer;
  padding-left: 0 !important;
}

/* Oculta el caret por defecto de DataTables/Responsive */
.oficios-scope table.dataTable > tbody > tr >
td.col-semaforo.dtr-control::before{
  content: "" !important;
  display: none !important;
}

/* Por defecto no mostrar nada (cuando NO está colapsada la tabla) */
.oficios-scope td.col-semaforo.dtr-control::after{
  content: "";
  display: none;
}

/* Mostrar triangulito SOLO cuando la tabla está colapsada */
.oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr >
td.col-semaforo.dtr-control::after{
  content: "▸";                 /* cerrado */
  display: block;
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px;              /* tamaño del icono */
  line-height: 1;
  color: rgba(0,0,0,.75);
  pointer-events: none;         /* no bloquea el click del control */
}

/* Cambiar a triangulito hacia abajo cuando está ABIERTO */
.oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr.parent >
td.col-semaforo.dtr-control::after,
.oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr.shown >
td.col-semaforo.dtr-control::after,
.oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr.dt-hasChild >
td.col-semaforo.dtr-control::after,
.oficios-scope table.dataTable.dtr-inline.collapsed > tbody > tr.dt-has-details >
td.col-semaforo.dtr-control::after{
  content: "▾";
  color: rgba(0,0,0,.9);
}

/* El hover/zebra no debe pintar encima del semáforo */
.oficios-scope .table-hover tbody tr:hover > td.col-semaforo,
.oficios-scope .table-striped tbody tr:nth-of-type(odd) > td.col-semaforo{
  background-color: var(--semaforo) !important;
}

  `;
        document.head.appendChild(style);
        return () => style.remove();
    }, []);

    useEffect(() => {
        const $doc: any = (jQuery as any)(document);

        // cuando Responsive muestra/oculta el detalle, marcamos la celda
        const handler = (_e: any, dt: any, row: any, show: boolean) => {
            const tr = row.node();
            (jQuery as any)("td.col-semaforo.dtr-control", tr).toggleClass(
                "is-open",
                show
            );
        };

        $doc.on("responsive-display.dt", handler);
        return () => $doc.off("responsive-display.dt", handler);
    }, []);

    useEffect(() => {
        const handler = () => {
            // Si ya no hay modales visibles, limpia forzado
            const anyVisible = !!document.querySelector(".modal.show");
            if (!anyVisible) {
                document.body.classList.remove("modal-open");
                document.body.removeAttribute("data-bs-padding-right");
                document.documentElement.style.overflow = "";
                document.body.style.overflow = "";
            }
        };

        // cuando un modal se oculta
        (jQuery as any)(document).on("hidden.bs.modal", handler);

        // por si hay errores de foco/iframes dentro del PDF
        window.addEventListener("blur", handler);

        return () => {
            (jQuery as any)(document).off("hidden.bs.modal", handler);
            window.removeEventListener("blur", handler);
        };
    }, []);

    // Utils de desbloqueo “duro”
    function forceUnlockBody() {
        const body = document.body;
        const html = document.documentElement;

        // quita clases de Bootstrap y de SweetAlert si existieran
        body.classList.remove("modal-open", "swal2-shown", "mo-locked");
        body.removeAttribute("data-bs-padding-right");

        // limpia estilos que suelen quedar pegados
        body.style.overflow = "";
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.paddingRight = "";
        html.style.overflow = "";
    }

    // Cada vez que cambia el estado de cualquiera de tus overlays,
    // si ya no hay ninguno abierto, desbloquea el body con un micro-delay
    useEffect(() => {
        const anyOpen = showPdf || showUpload || showLinea;
        if (!anyOpen) {
            // asegura que el unmount de los hijos ya corrió
            setTimeout(forceUnlockBody, 0);
        }
    }, [showPdf, showUpload, showLinea]);

    // “Seguro” adicional: si se cierra algo (de Bootstrap o lo que sea) y no queda ninguno visible, limpia.
    useEffect(() => {
        const handler = () => {
            const anyVisible =
                !!document.querySelector(".modal.show") ||
                showPdf ||
                showUpload ||
                showLinea;

            if (!anyVisible) forceUnlockBody();
        };

        (jQuery as any)(document).on("hidden.bs.modal", handler);
        window.addEventListener("blur", handler);

        return () => {
            (jQuery as any)(document).off("hidden.bs.modal", handler);
            window.removeEventListener("blur", handler);
        };
    }, []);

    return (
        <AppLayout>
            <Head>
                <title>Mis oficios</title>
                <meta
                    name="Oficios con respuestas"
                    content="Lista de oficios con respuestas asignadas."
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
                                    Oficios con respuestas
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
                                    <span
                                        className="tag tag-radius tag-round"
                                        style={{
                                            backgroundColor: "#2a0dbd",
                                            color: "#fff",
                                        }}
                                    >
                                        Informativos
                                    </span>
                                </div>
                                <div className="tags"></div>
                            </Card.Header>
                            <Card.Body>
                                <div
                                    className="panel panel-default oficios-scope"
                                    lang="es"
                                >
                                    <Tabs
                                        activeKey={activeTab}
                                        onSelect={(k) => {
                                            setActiveTab((k as any) ?? "tab1");
                                            onTabSelect();
                                        }}
                                    >
                                        <Tab eventKey="tab1" title="Activos">
                                            <Col
                                                md={12}
                                                className="table-responsive"
                                            >
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
                                                    id="activos-table"
                                                    data={activos}
                                                    className={tableClass}
                                                    options={{
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
                                                                            "Proceso",
                                                                            "Breve descripción",
                                                                            "Responsable",
                                                                            "Folio de respuesta",
                                                                            "Destinatario",
                                                                        ]
                                                                    ),
                                                            },
                                                        },
                                                        createdRow: (
                                                            row: HTMLTableRowElement,
                                                            data: any
                                                        ) => {
                                                            row.id = `row-activos-${data.id}`;
                                                        },
                                                        ...dtStateSave(
                                                            makeKey(
                                                                "activos-table"
                                                            )
                                                        ),
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
                                                                        7, 8,
                                                                    ],
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
                                                                                jQuery as any
                                                                            )(
                                                                                "#activos-table"
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
                                                                        const map =
                                                                            (
                                                                                o: any
                                                                            ) => {
                                                                                switch (
                                                                                    Number(
                                                                                        o.estatus_valor
                                                                                    )
                                                                                ) {
                                                                                    case 1:
                                                                                        return {
                                                                                            txt: "Se dio respuesta en tiempo",
                                                                                            argb: "FF5FD710",
                                                                                        };
                                                                                    case 2:
                                                                                        return {
                                                                                            txt: "Sin respuesta, en tiempo",
                                                                                            argb: "FFF5F233",
                                                                                        };
                                                                                    case 3:
                                                                                        return {
                                                                                            txt: "Sin respuesta, fuera de tiempo",
                                                                                            argb: "FFF98200",
                                                                                        };
                                                                                    case 4:
                                                                                        return {
                                                                                            txt: "Se dio respuesta fuera de tiempo",
                                                                                            argb: "FFFF2D2D",
                                                                                        };
                                                                                    case 0:
                                                                                        return {
                                                                                            txt: "Informativos",
                                                                                            argb: "FF2A0DBD",
                                                                                        };
                                                                                    default:
                                                                                        return {
                                                                                            txt: "—",
                                                                                            argb: "FFFFFFFF",
                                                                                        };
                                                                                }
                                                                            };
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
                                                                                    map(
                                                                                        r
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
                                                            }, // No. oficio

                                                            // Deja visibles estas antes que otras (porque ahora sí envuelven)
                                                            {
                                                                responsivePriority: 4,
                                                                targets: 3,
                                                            }, // Folio de respuesta
                                                            {
                                                                responsivePriority: 5,
                                                                targets: 4,
                                                            }, // Destinatario
                                                            {
                                                                responsivePriority: 4,
                                                                targets: 5,
                                                            }, // Breve descripciónDependencia/UA
                                                            {
                                                                responsivePriority: 5,
                                                                targets: 6,
                                                            }, // Área
                                                            {
                                                                responsivePriority: 6,
                                                                targets: 7,
                                                            }, // Proceso
                                                            {
                                                                responsivePriority: 7,
                                                                targets: 8,
                                                            }, // Breve descripción
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 9,
                                                            }, // Acciones (siempre visible)
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
                                                            defaultContent:
                                                                "&nbsp;",
                                                            render: (
                                                                data: any,
                                                                type: string
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? data ?? 99
                                                                    : "&nbsp;",
                                                            createdCell: (
                                                                td: any,
                                                                _c: any,
                                                                row: any
                                                            ) => {
                                                                const el =
                                                                    td as HTMLElement;
                                                                const c =
                                                                    row.color ||
                                                                    "#eee";
                                                                el.style.setProperty(
                                                                    "--semaforo",
                                                                    c
                                                                );
                                                                el.style.setProperty(
                                                                    "background-color",
                                                                    c,
                                                                    "important"
                                                                );
                                                                el.style.setProperty(
                                                                    "border",
                                                                    "1px solid #eee"
                                                                );
                                                                el.style.setProperty(
                                                                    "height",
                                                                    "32px"
                                                                );
                                                                /*                                                                 el.style.setProperty(
                                                                    "padding-left",
                                                                    "28px",
                                                                    "important"
                                                                ); // espacio para caret */
                                                                el.setAttribute(
                                                                    "role",
                                                                    "button"
                                                                );
                                                            },
                                                        },
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de ingreso",
                                                            className:
                                                                "text-wrap",
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
                                                                        ? `Fecha de vencimiento: ${fechaCorta(
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
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                            className:
                                                                "col-num-oficio text-nowrap",
                                                            searchable: true,
                                                        },
                                                        {
                                                            data: "folio_respuesta",
                                                            title: "Folio de respuesta",
                                                            className:
                                                                "col-num-oficio text-nowrap",
                                                            searchable: true,
                                                            render: (d) =>
                                                                d &&
                                                                d.trim() !== "0"
                                                                    ? d
                                                                    : "—",
                                                        },
                                                        {
                                                            data: "destinatario",
                                                            title: "Destinatario",
                                                            className:
                                                                "text-wrap",
                                                        },
                                                        {
                                                            data: "des",
                                                            title: "Dependencia/UA",
                                                            className:
                                                                "col-dependencia text-wrap no-break-words hyphenate",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área",
                                                            className:
                                                                "text-wrap",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Proceso",
                                                            className:
                                                                "no-break-words hyphenate text-wrap",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Breve descripción",
                                                            className:
                                                                "col-descripcion text-wrap",
                                                            render: (
                                                                d: any,
                                                                t: string
                                                            ) =>
                                                                t ===
                                                                    "display" ||
                                                                t === "filter"
                                                                    ? `<div class="texto-justificable no-break-words hyphenate">${(
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
                                                            data: "asunto",
                                                            title: "Respuesta",
                                                            visible: false,
                                                            searchable: true,
                                                        },
                                                    ]}
                                                    slots={{
                                                        9: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div
                                                                className="btns-acciones"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                {/* 1) Subir confirmación / Revisar respuesta */}
                                                                {row.enviado ===
                                                                1 ? (
                                                                    <Button
                                                                        type="button"
                                                                        className="btn-icon"
                                                                        variant="warning"
                                                                        title="Subir confirmación de recibido"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            form.clearErrors();
                                                                            form.setData(
                                                                                {
                                                                                    ...data,
                                                                                    id: row.id,
                                                                                    tipo: "respuesta",
                                                                                }
                                                                            );
                                                                            setShowUpload(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-upload"></i>
                                                                    </Button>
                                                                ) : (
                                                                    <Link
                                                                        href={route(
                                                                            "viewRespOficio",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                        className="btn btn-icon btn-primary"
                                                                        title="Revisar respuesta"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            setAnchor(
                                                                                "activos",
                                                                                row.id
                                                                            );
                                                                            saveScrollForCurrentPath();
                                                                        }}
                                                                    >
                                                                        <i className="zmdi zmdi-pin-account"></i>
                                                                    </Link>
                                                                )}

                                                                {/* 2) Línea de tiempo */}
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
                                                                    <i className="fa fa-history"></i>
                                                                </Button>

                                                                {/* 3) Ver respuesta al oficio (PDF) — solo si enviado===1 */}
                                                                {row.enviado ===
                                                                    1 && (
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
                                                                                    urlPdf: `imprime/pdf/0/${row.id}`,
                                                                                    extension:
                                                                                        "pdf",
                                                                                }
                                                                            );
                                                                            setShowPdf(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-file-pdf-o"></i>
                                                                    </Button>
                                                                )}

                                                                {/* 4) Ver PDF del oficio (siempre) */}
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
                                                                        setShowPdf(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-eye"></i>
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
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
                                                                            "No. Oficio / Folio",
                                                                            "Folio de respuesta",
                                                                            "Destinatario",
                                                                            "Dependencia/UA",
                                                                            "Área",
                                                                            "Proceso",
                                                                            "Breve descripción",
                                                                        ]
                                                                    ),
                                                            },
                                                        },
                                                        createdRow: (
                                                            row: HTMLTableRowElement,
                                                            data: any
                                                        ) => {
                                                            row.id = `row-historico-${data.id}`;
                                                        },
                                                        ...dtStateSave(
                                                            makeKey(
                                                                "historico-table"
                                                            )
                                                        ),
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
                                                                        7, 8,
                                                                    ],
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
                                                                                jQuery as any
                                                                            )(
                                                                                "#historico-table"
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
                                                                        const map =
                                                                            (
                                                                                o: any
                                                                            ) => {
                                                                                switch (
                                                                                    Number(
                                                                                        o.estatus_valor
                                                                                    )
                                                                                ) {
                                                                                    case 1:
                                                                                        return {
                                                                                            txt: "Se dio respuesta en tiempo",
                                                                                            argb: "FF5FD710",
                                                                                        };
                                                                                    case 2:
                                                                                        return {
                                                                                            txt: "Sin respuesta, en tiempo",
                                                                                            argb: "FFF5F233",
                                                                                        };
                                                                                    case 3:
                                                                                        return {
                                                                                            txt: "Sin respuesta, fuera de tiempo",
                                                                                            argb: "FFF98200",
                                                                                        };
                                                                                    case 4:
                                                                                        return {
                                                                                            txt: "Se dio respuesta fuera de tiempo",
                                                                                            argb: "FFFF2D2D",
                                                                                        };
                                                                                    case 0:
                                                                                        return {
                                                                                            txt: "Informativos",
                                                                                            argb: "FF2A0DBD",
                                                                                        };
                                                                                    default:
                                                                                        return {
                                                                                            txt: "—",
                                                                                            argb: "FFFFFFFF",
                                                                                        };
                                                                                }
                                                                            };
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
                                                                                    map(
                                                                                        r
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
                                                            }, // No. oficio
                                                            {
                                                                responsivePriority: 6,
                                                                targets: 3,
                                                            }, // Folio respuesta
                                                            {
                                                                responsivePriority: 7,
                                                                targets: 4,
                                                            }, // Destinatario

                                                            // Deja visibles estas antes que otras (porque ahora sí envuelven)
                                                            {
                                                                responsivePriority: 4,
                                                                targets: 5,
                                                            }, // Dependencia/UA
                                                            {
                                                                responsivePriority: 5,
                                                                targets: 6,
                                                            }, // Área
                                                            {
                                                                responsivePriority: 5,
                                                                targets: 7,
                                                            }, // Proceso
                                                            {
                                                                responsivePriority: 4,
                                                                targets: 8,
                                                            }, // Breve descripción
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 9,
                                                            }, // Acciones (siempre visible)
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
                                                            defaultContent:
                                                                "&nbsp;",
                                                            render: (
                                                                data,
                                                                type
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? data ?? 99
                                                                    : "&nbsp;",
                                                            createdCell: (
                                                                td: any,
                                                                _c: any,
                                                                row: any
                                                            ) => {
                                                                const el =
                                                                    td as HTMLElement;
                                                                const c =
                                                                    row.color ||
                                                                    "#eee";
                                                                el.style.setProperty(
                                                                    "--semaforo",
                                                                    c
                                                                );
                                                                el.style.setProperty(
                                                                    "background-color",
                                                                    c,
                                                                    "important"
                                                                );
                                                                el.style.setProperty(
                                                                    "border",
                                                                    "1px solid #eee"
                                                                );
                                                                el.style.setProperty(
                                                                    "height",
                                                                    "32px"
                                                                );
                                                                /*                                                                 el.style.setProperty(
                                                                    "padding-left",
                                                                    "28px",
                                                                    "important"
                                                                ); // espacio para caret */
                                                                el.setAttribute(
                                                                    "role",
                                                                    "button"
                                                                );
                                                            },
                                                        },
                                                        {
                                                            data: "f_ingreso",
                                                            title: "Fecha de ingreso",
                                                            render: (
                                                                _d,
                                                                type,
                                                                row
                                                            ) =>
                                                                type ===
                                                                    "sort" ||
                                                                type === "type"
                                                                    ? row.f_ingreso_raw
                                                                    : row.f_ingreso,
                                                        },
                                                        {
                                                            data: "numero_oficio",
                                                            title: "No. Oficio / Folio",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "folio_respuesta",
                                                            title: "Folio de respuesta",
                                                            defaultContent: "—",
                                                            searchable: true,
                                                            render: (d) =>
                                                                d &&
                                                                d.trim() !== "0"
                                                                    ? d
                                                                    : "—",
                                                        },
                                                        {
                                                            data: "destinatario",
                                                            title: "Destinatario",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "des",
                                                            title: "Dependencia/UA",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "proceso",
                                                            title: "Proceso",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Breve descripción",
                                                            className:
                                                                "col-descripcion text-wrap",
                                                            render: (
                                                                d: any,
                                                                t: string
                                                            ) =>
                                                                t ===
                                                                    "display" ||
                                                                t === "filter"
                                                                    ? `<div class="texto-justificable no-break-words hyphenate">${(
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
                                                            defaultContent: "",
                                                            className:
                                                                "text-center dt-acciones",
                                                        },
                                                        {
                                                            data: "asunto",
                                                            title: "Respuesta",
                                                            visible: false,
                                                            searchable: true,
                                                        },
                                                    ]}
                                                    slots={{
                                                        9: (
                                                            data: any,
                                                            row: any
                                                        ) => (
                                                            <div
                                                                className="btns-acciones"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                {/* Ver confirmación de recibido */}
                                                                <Button
                                                                    className="btn-icon"
                                                                    variant="danger"
                                                                    title="Ver confirmación de recibido"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.archivo_respuesta,
                                                                                extension:
                                                                                    row.extension,
                                                                            }
                                                                        );
                                                                        setShowPdf(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-file-pdf-o"></i>
                                                                </Button>

                                                                {/* Ver respuesta al oficio */}
                                                                <Button
                                                                    className="btn-icon"
                                                                    variant="danger"
                                                                    title="Ver respuesta al oficio"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.oficio_final,
                                                                                extension:
                                                                                    "pdf",
                                                                            }
                                                                        );
                                                                        setShowPdf(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-file-pdf-o"></i>
                                                                </Button>

                                                                {/* Ver PDF del oficio */}
                                                                <Button
                                                                    className="btn-icon"
                                                                    variant="danger"
                                                                    title="Ver PDF del oficio"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.archivo,
                                                                                extension:
                                                                                    "pdf",
                                                                            }
                                                                        );
                                                                        setShowPdf(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-eye"></i>
                                                                </Button>

                                                                {/* Línea de tiempo */}
                                                                <Button
                                                                    className="btn-icon"
                                                                    variant="success"
                                                                    onClick={() => {
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
                                                                    title="Ver línea de tiempo del oficio"
                                                                >
                                                                    <i className="fa fa-history"></i>
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                        <Tab
                                            eventKey="tab3"
                                            title="Informativos"
                                        >
                                            <Col md={12}>
                                                <DataTable
                                                    data={informativos}
                                                    className={tableClass}
                                                    options={{
                                                        ...baseDtOptions,
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
                                                            }, // fecha
                                                            {
                                                                responsivePriority: 1,
                                                                targets: 1,
                                                            }, // No Oficio / Folio
                                                            {
                                                                responsivePriority: 2,
                                                                targets: 2,
                                                            }, // descripción

                                                            {
                                                                responsivePriority: 3,
                                                                targets: 3,
                                                            }, // acciones
                                                        ],
                                                    }}
                                                    columns={[
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
                                                                "col-num-oficio text-nowrap",
                                                        },
                                                        {
                                                            data: "descripcion",
                                                            title: "Breve descripción",
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
                                                                "text-center dt-acciones",
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
                                                                {/* Ver PDF del oficio */}
                                                                <Button
                                                                    className="btn-icon"
                                                                    variant="danger"
                                                                    title="Ver PDF del oficio"
                                                                    onClick={() => {
                                                                        setVariables(
                                                                            {
                                                                                ...variables,
                                                                                urlPdf: row.archivo,
                                                                                extension:
                                                                                    "pdf",
                                                                            }
                                                                        );
                                                                        setShowPdf(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    <i className="fa fa-eye"></i>
                                                                </Button>
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                        <Tab
                                            eventKey="tab4"
                                            title="Oficios UPA"
                                        >
                                            <Col md={12}>
                                                <div className="mb-3 d-flex justify-content-end">
                                                    <button
                                                        className="btn btn-success"
                                                        onClick={() => {
                                                            const t = (
                                                                jQuery as any
                                                            )(
                                                                "#vd-table"
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
                                                    id="vd-table"
                                                    data={nuevoOfi}
                                                    className={tableClass}
                                                    options={{
                                                        ...baseDtOptions,
                                                        createdRow: (
                                                            row: HTMLTableRowElement,
                                                            data: any
                                                        ) => {
                                                            row.id = `row-vd-${data.id}`;
                                                        },
                                                        order: [[0, "desc"]],
                                                        lengthMenu: [
                                                            [25, 50, 100],
                                                            [25, 50, 100],
                                                        ],
                                                        pageLength: 25,
                                                        buttons: [
                                                            {
                                                                extend: "excel",
                                                                exportOptions: {
                                                                    columns: [
                                                                        0, 1, 2,
                                                                        3,
                                                                    ], // exporta solo las primeras 8 columnas
                                                                },
                                                            },
                                                        ],
                                                        columnDefs: [
                                                            ...(
                                                                baseDtOptions as any
                                                            ).columnDefs,
                                                            {
                                                                responsivePriority: 1,
                                                                targets: 0,
                                                            }, // fecha
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 1,
                                                            }, // No Folio
                                                            {
                                                                responsivePriority: 3,
                                                                targets: 2,
                                                            }, // Área
                                                            {
                                                                responsivePriority: 3,
                                                                targets: 3,
                                                            }, // Destinatario
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 4,
                                                            }, // acciones
                                                        ],
                                                    }}
                                                    columns={[
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
                                                            data: "oficio_respuesta",
                                                            title: "Num Folio/Oficio",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "nombre_desti",
                                                            title: "Destinatario",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "id",
                                                            title: "Acciones",
                                                            orderable: false,
                                                            searchable: false,
                                                            defaultContent: "",
                                                            className:
                                                                "text-center dt-acciones",
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
                                                                {row.masivo ==
                                                                1 ? (
                                                                    row.enviado ===
                                                                    1 ? (
                                                                        row.archivo_respuesta ===
                                                                        null ? (
                                                                            <Button
                                                                                className="btn-icon"
                                                                                variant="warning"
                                                                                title="Subir confirmación de recibido"
                                                                                onClick={() => {
                                                                                    form.clearErrors();
                                                                                    form.setData(
                                                                                        {
                                                                                            ...data,
                                                                                            id: row.id,
                                                                                            tipo: "nuevo",
                                                                                        }
                                                                                    );
                                                                                    setShowUpload(
                                                                                        true
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <i className="fa fa-upload"></i>
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                className="btn-icon"
                                                                                variant="danger"
                                                                                title="Ver confirmación de recibido"
                                                                                onClick={() => {
                                                                                    setVariables(
                                                                                        {
                                                                                            ...variables,
                                                                                            urlPdf: row.archivo_respuesta,
                                                                                            extension:
                                                                                                row.extension,
                                                                                        }
                                                                                    );
                                                                                    setShowUpload(
                                                                                        true
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <i className="fa fa-file-pdf-o"></i>
                                                                            </Button>
                                                                        )
                                                                    ) : null
                                                                ) : row.enviado ===
                                                                  1 ? (
                                                                    <Link
                                                                        href={route(
                                                                            "oficios.confirmaRecibidosNuevos",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            setAnchor(
                                                                                "vd",
                                                                                row.id
                                                                            );
                                                                            saveScrollForCurrentPath();
                                                                        }}
                                                                    >
                                                                        <Button
                                                                            className="btn-icon"
                                                                            variant="warning"
                                                                            title="Confirmaciones de recibido"
                                                                        >
                                                                            <i className="fa fa-handshake-o"></i>
                                                                        </Button>
                                                                    </Link>
                                                                ) : null}

                                                                {row.enviado ===
                                                                null ? (
                                                                    <Link
                                                                        href={route(
                                                                            "viewRespNuevoOficio",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            setAnchor(
                                                                                "vd",
                                                                                row.id
                                                                            );
                                                                            saveScrollForCurrentPath();
                                                                        }}
                                                                    >
                                                                        <Button
                                                                            className="btn-icon"
                                                                            variant="primary"
                                                                            title="Revisar respuesta"
                                                                        >
                                                                            <i className="zmdi zmdi-pin-account"></i>
                                                                        </Button>
                                                                    </Link>
                                                                ) : null}

                                                                <Link
                                                                    href={route(
                                                                        "oficios.detalleNuevo",
                                                                        {
                                                                            id: row.id,
                                                                        }
                                                                    )}
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        setAnchor(
                                                                            "vd",
                                                                            row.id
                                                                        );
                                                                        saveScrollForCurrentPath();
                                                                    }}
                                                                >
                                                                    <Button
                                                                        className="btn-icon"
                                                                        variant="danger"
                                                                        title="Ver detalle del oficio"
                                                                    >
                                                                        <i className="fa fa-eye"></i>
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                        <Tab
                                            eventKey="tab5"
                                            title="Oficios UPA Histórico"
                                        >
                                            <Col md={12}>
                                                <div className="mb-3 d-flex justify-content-end">
                                                    <button
                                                        className="btn btn-success"
                                                        onClick={() => {
                                                            const t = (
                                                                jQuery as any
                                                            )(
                                                                "#vd-historico-table"
                                                            ).DataTable();
                                                            const rowsApi =
                                                                t.rows({
                                                                    search: "applied",
                                                                    order: "applied",
                                                                });
                                                            const dataArr =
                                                                rowsApi
                                                                    .data()
                                                                    .toArray();
                                                            (
                                                                window as any
                                                            ).__DT_EXPORT_ACTIVOS__ =
                                                                {
                                                                    colors: (
                                                                        dataArr as any[]
                                                                    ).map(
                                                                        (
                                                                            r: any
                                                                        ) =>
                                                                            String(
                                                                                r?.color ??
                                                                                    "#ffffff"
                                                                            )
                                                                    ),
                                                                    labels: (
                                                                        dataArr as any[]
                                                                    ).map(
                                                                        (
                                                                            r: any
                                                                        ) =>
                                                                            getStatusLabel(
                                                                                Number(
                                                                                    r?.estatus_valor ??
                                                                                        99
                                                                                )
                                                                            )
                                                                    ),
                                                                } as any;
                                                            t.button(
                                                                ".buttons-excel"
                                                            ).trigger();
                                                        }}
                                                    >
                                                        Exportar a Excel
                                                    </button>
                                                </div>
                                                <DataTable
                                                    id="vd-historico-table"
                                                    data={nuevoHistorico}
                                                    className={tableClass}
                                                    options={{
                                                        ...baseDtOptions,
                                                        createdRow: (
                                                            row: HTMLTableRowElement,
                                                            data: any
                                                        ) => {
                                                            row.id = `row-vdh-${data.id}`;
                                                        },
                                                        order: [[0, "desc"]],
                                                        lengthMenu: [
                                                            [25, 50, 100],
                                                            [25, 50, 100],
                                                        ],
                                                        pageLength: 25,
                                                        buttons: [
                                                            {
                                                                extend: "excel",
                                                                exportOptions: {
                                                                    columns: [
                                                                        0, 1, 2,
                                                                        3,
                                                                    ], // exporta solo las primeras 8 columnas
                                                                },
                                                            },
                                                        ],
                                                        columnDefs: [
                                                            ...(
                                                                baseDtOptions as any
                                                            ).columnDefs,
                                                            {
                                                                responsivePriority: 1,
                                                                targets: 0,
                                                            }, // fecha
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 1,
                                                            }, // No Folio
                                                            {
                                                                responsivePriority: 3,
                                                                targets: 2,
                                                            }, // Área
                                                            {
                                                                responsivePriority: 3,
                                                                targets: 3,
                                                            }, // Destinatario
                                                            {
                                                                responsivePriority: 0,
                                                                targets: 4,
                                                            }, // acciones
                                                        ],
                                                    }}
                                                    columns={[
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
                                                            data: "oficio_respuesta",
                                                            title: "Num Folio/Oficio",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "area",
                                                            title: "Área",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "nombre_desti",
                                                            title: "Destinatario",
                                                            className:
                                                                "text-break",
                                                        },
                                                        {
                                                            data: "id",
                                                            title: "Acciones",
                                                            orderable: false,
                                                            searchable: false,
                                                            defaultContent: "",
                                                            className:
                                                                "text-center dt-acciones",
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
                                                                {row.masivo ==
                                                                1 ? (
                                                                    // Ver confirmación de recibido (PDF)
                                                                    <Button
                                                                        className="btn-icon"
                                                                        variant="danger"
                                                                        title="Ver confirmación de recibido"
                                                                        onClick={() => {
                                                                            setVariables(
                                                                                {
                                                                                    ...variables,
                                                                                    urlPdf: row.archivo_respuesta,
                                                                                    extension:
                                                                                        row.extension,
                                                                                }
                                                                            );
                                                                            setShowPdf(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-file-pdf-o"></i>
                                                                    </Button>
                                                                ) : (
                                                                    // Confirmaciones de recibido
                                                                    <Link
                                                                        href={route(
                                                                            "oficios.confirmaRecibidosNuevos",
                                                                            {
                                                                                id: row.id,
                                                                            }
                                                                        )}
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            setAnchor(
                                                                                "vdh",
                                                                                row.id
                                                                            );
                                                                            saveScrollForCurrentPath();
                                                                        }}
                                                                    >
                                                                        <Button
                                                                            className="btn-icon"
                                                                            variant="warning"
                                                                            title="Confirmaciones de recibido"
                                                                        >
                                                                            <i className="fa fa-handshake-o"></i>
                                                                        </Button>
                                                                    </Link>
                                                                )}

                                                                {/* Ver detalle del oficio */}
                                                                <Link
                                                                    href={route(
                                                                        "oficios.detalleNuevo",
                                                                        {
                                                                            id: row.id,
                                                                        }
                                                                    )}
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    <Button
                                                                        className="btn-icon"
                                                                        variant="danger"
                                                                        title="Ver detalle del oficio"
                                                                    >
                                                                        <i className="fa fa-eye"></i>
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        ),
                                                    }}
                                                ></DataTable>
                                            </Col>
                                        </Tab>
                                    </Tabs>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Modal show={showUpload} onHide={() => setShowUpload(false)}>
                    <ModalHeader>
                        <ModalTitle as="h5">Evidencía de recibido</ModalTitle>
                    </ModalHeader>
                    <form onSubmit={submit}>
                        <ModalBody>
                            <Row>
                                <Col xs={12}>
                                    <Form.Label>
                                        Evidencia de confirmación de recibido:
                                    </Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept=".pdf,.jpg,.png,.jpeg"
                                        className={
                                            form.errors.archivo
                                                ? "inputError"
                                                : ""
                                        }
                                        ref={fileInputRef}
                                        onChange={(e) => handleChangeS(e)}
                                    />

                                    <InputError
                                        className="mt-1"
                                        message={form.errors.archivo}
                                    />
                                </Col>
                            </Row>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="secondary"
                                onClick={() => setShowUpload(false)}
                            >
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit">
                                Subir evidencia
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>

                <VerPdf
                    urlPdf={variables.urlPdf}
                    show={showPdf}
                    tipo={variables.extension}
                    setShow={setShowPdf}
                />

                <LineaTiempo
                    showLinea={showLinea}
                    setShowLinea={setShowLinea}
                    id={variables.idOfico}
                />
            </Fragment>
        </AppLayout>
    );
};

export default OficiosRespuestas;
