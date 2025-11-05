import AppLayout from "../../Layouts/app";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    FormEventHandler,
    Fragment,
    useEffect,
    useRef,
    useState,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from "react";
import { Card, Row, Col, Form, Tabs, Tab, Button } from "react-bootstrap";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import TituloCard from "@/types/TituloCard";
import Select, { SelectInstance } from "react-select";
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
// @ts-ignore
import language from "datatables.net-plugins/i18n/es-MX.mjs";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";
import "../../../css/suneditor.css";
import SelectorDestinatarios, {
    SelectorDestinatariosHandle,
    Destinatario,
} from "@/Components/SelectorDestinatarios";

DataTable.use(DT);

type FormIn = {
    id: number;
    descripcion: string;
    archivo: File | null;
};
function getCookie(name: string): string {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        // @ts-ignore
        return decodeURIComponent(parts.pop().split(";").shift());
    }
    return "";
}

// Quita invisibles (ZWSP, FEFF, soft hyphen, object replacement, replacement char)
// Normaliza NBSP→espacio
// Elimina "?" huérfanos (cuando el nodo solo contiene ese carácter)
function scrubWeirdArtifacts(html: string) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // 1) Limpiar texto nodo por nodo
    const tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const toRemove: Text[] = [];
    while (tw.nextNode()) {
        const tn = tw.currentNode as Text;
        const original = tn.nodeValue || "";
        let s = original;

        // invisibles / controles comunes de Office
        s = s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, ""); // zero-widths
        s = s.replace(/\u00AD/g, ""); // soft hyphen
        s = s.replace(/\uFFFC/g, ""); // object replacement
        s = s.replace(/\uFFFD/g, ""); // replacement char
        s = s.replace(/\u00A0/g, " "); // NBSP → espacio normal

        // "?" huérfano: sólo espacios y un "?"
        if (/^[\s]*\?[\s]*$/.test(s)) {
            toRemove.push(tn);
            continue;
        }

        if (s !== original) tn.nodeValue = s;
    }

    // eliminar los text nodes marcados y sus envoltorios vacíos
    toRemove.forEach((tn) => {
        const parent = tn.parentNode as HTMLElement;
        tn.remove();
        let el: HTMLElement | null = parent;
        while (el && el !== doc.body) {
            const onlyBr =
                el.childNodes.length === 1 && el.firstChild?.nodeName === "BR";
            const emptyText = (el.textContent || "").trim() === "";
            if (el.childNodes.length === 0 || onlyBr || emptyText) {
                el.remove();
                el = el.parentElement as HTMLElement | null;
            } else break;
        }
    });

    // 2) Por si quedaron elementos que sólo contienen "?" (p, div, span, strong, em)
    doc.querySelectorAll("p,div,span,strong,em").forEach((el) => {
        const t = (el.textContent || "").replace(/\s/g, "");
        if (t === "?") el.remove();
    });

    return doc.body.innerHTML;
}
const escapeHtml = (s: string) =>
    s.replace(
        /[&<>"']/g,
        (m) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;",
            }[m] as string)
    );

// === Estilos permitidos en tablas y celdas ===
const SAFE_TABLE_STYLES = new Set([
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-width",
    "border-style",
    "border-color",
    "border-collapse",
    "border-spacing",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "width",
    "min-width",
    "max-width",
    "height",
    "min-height",
    "max-height",
    "table-layout",
    "text-align",
    "vertical-align",
    "white-space",
    "word-break",
    "background",
    "background-color",
    "color",
    "font-weight",
    "font-style",
    "font-size",
    "line-height",
]);

function parseStyle(style: string) {
    const map = new Map<string, string>();
    (style || "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => {
            const [prop, ...rest] = s.split(":");
            if (!prop || rest.length === 0) return;
            const name = prop.trim().toLowerCase();
            const val = rest.join(":").trim();
            if (!name || !val) return;
            map.set(name, val); // la última gana
        });
    return map;
}

function stringifyStyle(map: Map<string, string>, order?: string[]) {
    const entries = order
        ? order
              .filter((k) => map.has(k))
              .map((k) => [k, map.get(k)!] as [string, string])
        : Array.from(map.entries());
    return entries.map(([k, v]) => `${k}:${v}`).join(";");
}

function dedupeStyle(style: string, whitelist?: Set<string>) {
    const m = parseStyle(style);
    if (whitelist) {
        for (const k of Array.from(m.keys()))
            if (!whitelist.has(k)) m.delete(k);
    }
    const s = stringifyStyle(m);
    return s || "";
}

function removeProps(style: string, props: string[]) {
    const m = parseStyle(style);
    props.forEach((p) => m.delete(p.toLowerCase()));
    const s = stringifyStyle(m);
    return s || "";
}

function dedupeAllInlineStyles(doc: Document) {
    (doc.querySelectorAll("[style]") as NodeListOf<HTMLElement>).forEach(
        (el) => {
            const s = dedupeStyle(el.getAttribute("style") || "");
            if (s) el.setAttribute("style", s);
            else el.removeAttribute("style");
        }
    );
}

// Convierte TSV (Excel copiado como texto) en <table>
function tsvToTable(tsv: string) {
    const rows = tsv.replace(/\r/g, "").split("\n").filter(Boolean);
    const htmlRows = rows
        .map((r) => {
            const cells = r
                .split("\t")
                .map((c) => `<td>${escapeHtml(c)}</td>`)
                .join("");
            return `<tr>${cells}</tr>`;
        })
        .join("");
    return `<table><tbody>${htmlRows}</tbody></table>`;
}

function sanitizeTableHtml(html: string) {
    const allowed = new Set([
        "table",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "th",
        "td",
        "caption",
    ]);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tables = Array.from(doc.querySelectorAll("table"));
    if (!tables.length) return "";
    for (const root of tables) {
        const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        const strip: Element[] = [];
        while (walker.nextNode()) {
            const el = walker.currentNode as Element;
            if (!allowed.has(el.tagName.toLowerCase())) strip.push(el);
        }
        for (const el of strip) {
            const p = el.parentNode!;
            while (el.firstChild) p.insertBefore(el.firstChild, el);
            p.removeChild(el);
        }
        root.querySelectorAll("*").forEach((el) => {
            const tag = el.tagName.toLowerCase();
            const keepSet = new Set(["rowspan", "colspan"]); // solo estos
            Array.from((el as Element).attributes).forEach((a) => {
                if (
                    !(
                        (tag === "td" || tag === "th") &&
                        keepSet.has(a.name.toLowerCase())
                    )
                ) {
                    (el as Element).removeAttribute(a.name);
                }
            });
        });
    }
    return tables.map((t) => t.outerHTML).join("<br>");
}

// ⭐ Normalizador opcional para convertir inline px → pt (por si ya hay contenido viejo)
const pxToPt = (px: number) => Math.round(px * 0.75);

// Filtra style="..." quedándose SOLO con propiedades seguras
function keepOnlySafeTableStyles(style: string) {
    const kept: string[] = [];
    for (const raw of style.split(";")) {
        const decl = raw.trim();
        if (!decl) continue;
        const [prop, ...rest] = decl.split(":");
        if (!prop || rest.length === 0) continue;
        const name = prop.trim().toLowerCase();

        // basura típica de Word/Excel
        if (
            /^(mso-|page-break|tab-stops|orphans|widows|margin(-left|-right|-top|-bottom)?)\b/.test(
                name
            )
        )
            continue;

        if (SAFE_TABLE_STYLES.has(name)) {
            let value = rest.join(":").trim();
            value = value.replace(
                /([\d.]+)px\b/gi,
                (_m, n) => `${pxToPt(parseFloat(n))}pt`
            );
            kept.push(`${name}:${value}`);
        }
    }
    return kept.join("; ");
}

// pasa text-align de hijos (<p>/<span>) a la celda si fuera necesario
function liftChildAlignmentToCell(cell: HTMLElement) {
    if (cell.style.textAlign) return;
    const el = cell.firstElementChild as HTMLElement | null;
    if (!el) return;
    const s = (el.getAttribute("style") || "").toLowerCase();
    const m = s.match(/text-align\s*:\s*(left|center|right|justify)/);
    if (m) {
        cell.setAttribute(
            "style",
            `${cell.getAttribute("style") || ""}${
                cell.getAttribute("style") ? ";" : ""
            }text-align:${m[1]}`
        );
    }
}
function stripMsOfficeNodes(doc: Document) {
    // elimina nodos cuyo tag tiene dos puntos (v:, o:, w:, etc.)
    doc.querySelectorAll("*").forEach((el) => {
        if (el.tagName.includes(":")) el.remove();
    });
}
// 🔧 sanea TODAS las tablas que ya estén en el HTML (no solo al pegar)
// ---------- SANITIZA tablas ya existentes (blur/commit) ----------
function sanitizeTablesDeep(html: string) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    stripMsOfficeNodes(doc);

    const allowed = new Set([
        "table",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "th",
        "td",
        "caption",
        "colgroup",
        "col",
        // permitir formato inline dentro de celdas
        "strong",
        "b",
        "em",
        "i",
        "u",
        "span",
        "br",
        "sub",
        "sup",
    ]);

    const SAFE_CELL_STYLES = new Set([
        "border",
        "border-top",
        "border-right",
        "border-bottom",
        "border-left",
        "border-width",
        "border-style",
        "border-color",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "text-align",
        "vertical-align",
        "white-space",
        "word-break",
        "background",
        "background-color",
        "color",
        "font-weight",
        "font-style",
        "font-size",
        "line-height",
    ]);

    doc.querySelectorAll("table").forEach((table) => {
        // 1) Dejar solo etiquetas permitidas (pero NO tirar strong/em/etc.)
        table.querySelectorAll("*").forEach((el) => {
            const tag = el.tagName.toLowerCase();
            if (!allowed.has(tag)) {
                const p = el.parentNode!;
                while (el.firstChild) p.insertBefore(el.firstChild, el);
                el.remove();
            }
        });

        // 2) Quitar NBSP en TODA la tabla
        table.querySelectorAll<HTMLElement>("th,td").forEach((cell) => {
            cell.innerHTML = cell.innerHTML.replace(/&nbsp;|\u00A0/gi, " ");
        });

        // 3) Tabla raíz con estilo canónico (no concatenar)
        table.removeAttribute("width");
        table.removeAttribute("height");
        table.removeAttribute("align");
        table.setAttribute(
            "style",
            "width:100%;max-width:100%;margin:0;table-layout:fixed;border-collapse:collapse;border-spacing:0"
        );
        table.setAttribute(
            "cellpadding",
            table.getAttribute("cellpadding") || "0"
        );
        table.setAttribute(
            "cellspacing",
            table.getAttribute("cellspacing") || "0"
        );

        // 4) TR sin height
        table.querySelectorAll("tr").forEach((tr) => {
            tr.removeAttribute("height");
            const s = removeProps(
                (tr as HTMLElement).getAttribute("style") || "",
                ["height"]
            );
            if (s) (tr as HTMLElement).setAttribute("style", s);
            else (tr as HTMLElement).removeAttribute("style");
        });

        // 5) TH/TD: filtrar estilos + line-height:1 (preservando background/color/bold)
        table.querySelectorAll<HTMLElement>("th,td").forEach((el) => {
            el.removeAttribute("width");
            el.removeAttribute("height");
            el.removeAttribute("align");
            el.removeAttribute("valign");

            // filtra a estilos seguros
            const kept = parseStyle(el.getAttribute("style") || "");
            for (const k of Array.from(kept.keys())) {
                if (!SAFE_CELL_STYLES.has(k)) kept.delete(k);
            }
            kept.set("line-height", "1");
            const final = stringifyStyle(kept);
            if (final) el.setAttribute("style", final);
            else el.removeAttribute("style");
        });
    });

    // dedupe global de estilos (por si quedó algún duplicado)
    dedupeAllInlineStyles(doc);

    return doc.body.innerHTML;
}

// ===== Sanitizador de tablas (con estilos seguros) =====
function sanitizeTableHtmlKeepStyles(html: string) {
    const SAFE_TD = new Set([
        "border",
        "border-top",
        "border-right",
        "border-bottom",
        "border-left",
        "border-width",
        "border-style",
        "border-color",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "text-align",
        "vertical-align",
        "white-space",
        "word-break",
        "background",
        "background-color",
        "color",
        "font-weight",
        "font-style",
        "font-size",
    ]);

    const doc = new DOMParser().parseFromString(html, "text/html");

    // Quita tags de Office (v:, o:, w:, etc.)
    doc.querySelectorAll("*").forEach((el) => {
        if (el.tagName.includes(":")) el.remove();
    });

    const tables = Array.from(doc.querySelectorAll("table"));
    if (!tables.length) return "";

    for (const table of tables) {
        // 1) Deja solo etiquetas de tabla
        const allowedTags = new Set([
            "table",
            "thead",
            "tbody",
            "tfoot",
            "tr",
            "th",
            "td",
            "caption",
            "colgroup",
            "col",
        ]);
        table.querySelectorAll("*").forEach((el) => {
            const tag = el.tagName.toLowerCase();
            if (!allowedTags.has(tag)) {
                const p = el.parentNode!;
                while (el.firstChild) p.insertBefore(el.firstChild, el);
                el.remove();
            }
        });

        // 2) Elimina NBSP en TODO el contenido de la tabla (th y td)
        table.querySelectorAll<HTMLElement>("th,td").forEach((cell) => {
            cell.innerHTML = cell.innerHTML.replace(/&nbsp;|\u00A0/gi, " ");
        });

        // 3) Tabla raíz: estilo canónico sin repeticiones
        table.removeAttribute("width");
        table.removeAttribute("height");
        table.removeAttribute("align");
        table.setAttribute(
            "style",
            "width:100%;max-width:100%;margin:0;table-layout:fixed;border-collapse:collapse;border-spacing:0"
        );
        table.setAttribute(
            "cellpadding",
            table.getAttribute("cellpadding") || "0"
        );
        table.setAttribute(
            "cellspacing",
            table.getAttribute("cellspacing") || "0"
        );

        // 4) TR: sin height
        table.querySelectorAll("tr").forEach((tr) => {
            tr.removeAttribute("height");
            const h = (tr as HTMLElement).getAttribute("style") || "";
            const clean = h.replace(/(^|;)\s*height\s*:[^;]+/gi, "").trim();
            if (clean) (tr as HTMLElement).setAttribute("style", clean);
            else (tr as HTMLElement).removeAttribute("style");
        });

        // 5) TH: solo background-color y font-weight (si venían) + line-height:1
        table.querySelectorAll("th").forEach((th) => {
            const el = th as HTMLElement;

            // background-color (propio o heredado de TR)
            let bg = "";
            const own = (el.getAttribute("style") || "").match(
                /(?:background|background-color)\s*:\s*([^;]+)/i
            );
            if (own) bg = own[1].trim();
            if (!bg) {
                const tr = el.parentElement as HTMLElement;
                const inh = (tr?.getAttribute("style") || "").match(
                    /(?:background|background-color)\s*:\s*([^;]+)/i
                );
                if (inh) bg = inh[1].trim();
            }

            const keep = new Map<string, string>();
            if (bg) keep.set("background-color", bg);
            const w = (el.getAttribute("style") || "").match(
                /font-weight\s*:\s*([^;]+)/i
            );
            if (w) keep.set("font-weight", w[1].trim()); // solo si venía
            keep.set("line-height", "1");

            el.removeAttribute("width");
            el.removeAttribute("height");
            el.removeAttribute("align");
            el.removeAttribute("valign");

            const order = ["background-color", "font-weight", "line-height"];
            const final = order
                .filter((k) => keep.has(k))
                .map((k) => `${k}:${keep.get(k)}`)
                .join(";");
            if (final) el.setAttribute("style", final);
            else el.removeAttribute("style");
        });

        // 6) TD: estilos seguros (sin height) + line-height:1
        table.querySelectorAll("td").forEach((td) => {
            const el = td as HTMLElement;
            const style = (el.getAttribute("style") || "")
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
                .reduce((acc, decl) => {
                    const [prop, ...rest] = decl.split(":");
                    if (!prop || rest.length === 0) return acc;
                    const name = prop.trim().toLowerCase();
                    if (name === "height") return acc; // nunca height
                    if (SAFE_TD.has(name)) acc.set(name, rest.join(":").trim());
                    return acc;
                }, new Map<string, string>());
            style.set("line-height", "1");

            el.removeAttribute("width");
            el.removeAttribute("height");
            el.removeAttribute("align");
            el.removeAttribute("valign");

            const final = Array.from(style.entries())
                .map(([k, v]) => `${k}:${v}`)
                .join(";");
            if (final) el.setAttribute("style", final);
            else el.removeAttribute("style");
        });
    }

    return tables.map((t) => t.outerHTML).join("<br>");
}

// Si ya la estás llamando desde sanitizeTablesDeep, no cambies nada más.
// sanitizeTablesDeep(html) puede quedarse igual, porque reutiliza sanitizeTableHtmlKeepStyles.

const normalizePxToPt = (html: string) =>
    html.replace(
        /font-size:\s*([\d.]+)px/gi,
        (_m, n) => `font-size:${pxToPt(parseFloat(n))}pt`
    );

type EditorAsuntoProps = {
    data: { asunto: string; id_oficio: number };
    setData: (field: "asunto", value: string) => void;
    sunEditorLangEs: any;
};

type EditorAsuntoHandle = { commit: () => string };

// Quita declaraciones mso- de un style inline
function stripMsoDecl(style: string) {
    return (style || "").replace(/(^|;)\s*mso-[^:]+:[^;]+/gi, "").trim();
}

// Limpia una tabla EN SITIO para PDF: sin margins/widths y con layout predecible
function cleanTableInPlaceForPdf(table: Element) {
    // quita width/height en atributos “antiguos”
    ["width", "height", "align"].forEach((a) => table.removeAttribute(a));

    // limpia el style de la tabla
    const rootStyle = stripMsoDecl(table.getAttribute("style") || "")
        .replace(/(^|;)\s*width\s*:[^;]+/gi, "")
        .replace(/(^|;)\s*margin(-left|-right|-top|-bottom)?\s*:[^;]+/gi, "");

    table.setAttribute(
        "style",
        `${rootStyle ? rootStyle + ";" : ""}` +
            "width:100%;max-width:100%;margin:0;table-layout:fixed;border-collapse:collapse;border-spacing:0"
    );

    // forza paddings/spacing a 0 si no vienen
    if (!table.getAttribute("cellpadding"))
        table.setAttribute("cellpadding", "0");
    if (!table.getAttribute("cellspacing"))
        table.setAttribute("cellspacing", "0");

    // limpia celdas/colgroups: nada de width inline ni mso-*
    (
        table.querySelectorAll("colgroup,col,th,td") as NodeListOf<HTMLElement>
    ).forEach((el) => {
        el.removeAttribute("width");
        el.removeAttribute("height");
        el.removeAttribute("align");
        const s = stripMsoDecl(el.getAttribute("style") || "");
        el.setAttribute("style", s.replace(/(^|;)\s*width\s*:[^;]+/gi, ""));
    });
}

// Convierte las clases de SunEditor (__se__float-*) a estilos inline comprensibles por el PDF
function normalizeImagesForPdf(doc: Document) {
    // contenedor de imagen de SunEditor
    (
        doc.querySelectorAll(
            ".se-component.se-image-container"
        ) as NodeListOf<HTMLElement>
    ).forEach((box) => {
        const cls = box.className || "";
        let align = "left";
        if (cls.includes("__se__float-right")) align = "right";
        else if (cls.includes("__se__float-center")) align = "center";

        // estilo canónico del contenedor
        box.removeAttribute("class");
        box.setAttribute("style", `text-align:${align};margin:8px 0`);

        const fig = box.querySelector("figure") as HTMLElement | null;
        if (fig) {
            // estilo canónico de figure
            fig.setAttribute("style", "display:inline-block;margin:0");
        }
        const img = box.querySelector("img") as HTMLElement | null;
        if (img) {
            // construir estilo por mapa → sin duplicados
            const m = parseStyle(img.getAttribute("style") || "");
            m.set("display", "inline-block"); // una vez
            // respetar width/height existentes (atributo o estilo)
            if (!m.has("width") && img.getAttribute("width"))
                m.set("width", `${img.getAttribute("width")}px`);
            if (!m.has("height") && img.getAttribute("height"))
                m.set("height", `${img.getAttribute("height")}px`);
            img.setAttribute(
                "style",
                stringifyStyle(m, ["display", "width", "height"])
            );
        }
    });
}

// Saneado FINAL (para DB/PDF): imágenes + tablas + quitar mso-* global
function finalizeHtmlForPdf(html: string) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    normalizeImagesForPdf(doc);

    // limpia mso-* en TODOS los styles
    (doc.querySelectorAll("[style]") as NodeListOf<HTMLElement>).forEach(
        (el) => {
            el.setAttribute(
                "style",
                stripMsoDecl(el.getAttribute("style") || "")
            );
        }
    );

    // tablas a layout canónico (sin márgenes/width)
    doc.querySelectorAll("table").forEach((t) => cleanTableInPlaceForPdf(t));

    // 🔧 deduplicar estilos en TODO el documento (figuras, imágenes, tablas…)
    dedupeAllInlineStyles(doc);

    return doc.body.innerHTML;
}

// ✅ debe quedar así (sin export default)
const EditorAsunto = forwardRef<EditorAsuntoHandle, EditorAsuntoProps>(
    ({ data, setData, sunEditorLangEs }, ref) => {
        const editorRef = useRef<any>(null);
        const [editorReady, setEditorReady] = useState(false);

        // SunEditor instance
        const getSunEditorInstance = useCallback((inst: any) => {
            editorRef.current = inst;
            setEditorReady(true); // 👈 ahora sí montamos el listener cuando exista
        }, []);

        // Inserta usando la API disponible
        const pasteInto = useCallback((html: string) => {
            const inst = editorRef.current;
            const fn = inst?.pasteHTML || inst?.insertHTML;
            if (fn) {
                fn.call(inst, html);
            } else {
                const wz: HTMLElement | undefined =
                    inst?.core?.context?.element?.wysiwyg;
                wz?.focus();
                document.execCommand("insertHTML", false, html);
            }
        }, []);

        // Handler nativo de pegado (tablas/TSV/texto plano)
        const onNativePaste = useCallback(
            (evt: ClipboardEvent) => {
                try {
                    const dt =
                        evt.clipboardData || (window as any).clipboardData;
                    const types = Array.from(dt?.types || []);
                    const html = types.includes("text/html")
                        ? (dt.getData("text/html") as string)
                        : "";
                    const text = (dt?.getData?.("text/plain") as string) || "";

                    let toInsert = "";

                    // A) Tabla (Word/Excel) como HTML
                    if (html && /<(table|tr|td|th)\b/i.test(html)) {
                        toInsert = sanitizeTableHtmlKeepStyles(html);
                        if (!toInsert)
                            toInsert =
                                html.match(/<table[\s\S]*?<\/table>/i)?.[0] ||
                                "";
                    }

                    // B) Excel como texto tabulado
                    if (!toInsert && text && /\t/.test(text)) {
                        toInsert = tsvToTable(text);
                    }

                    // C) Texto normal → plano (respeta defaultStyle)
                    if (!toInsert) {
                        toInsert = escapeHtml(text).replace(/\r?\n/g, "<br>");
                    }
                    // ⬇️ limpia artefactos antes de insertar
                    toInsert = scrubWeirdArtifacts(toInsert);

                    // Insertamos y detenemos manejo interno
                    evt.preventDefault();
                    evt.stopPropagation();
                    (evt as any).stopImmediatePropagation?.();
                    pasteInto(toInsert);
                } catch {
                    // si algo falla, que SunEditor haga lo suyo
                }
            },
            [pasteInto]
        );

        // Monta el listener cuando el editor está listo
        useEffect(() => {
            if (!editorReady) return;
            const inst = editorRef.current;
            const wz: HTMLElement | undefined =
                inst?.core?.context?.element?.wysiwyg;
            if (!wz) return;

            wz.addEventListener("paste", onNativePaste as any, true); // captura primero
            return () =>
                wz.removeEventListener("paste", onNativePaste as any, true);
        }, [editorReady, onNativePaste]);

        useEffect(() => {
            (window as any).__getCleanEditorAsunto = () => {
                if (!editorRef.current?.getContents) return "";
                let html = editorRef.current.getContents(true);
                html = normalizePxToPt(html);
                html = normalizeImagesHtml(html);
                html = finalizeHtmlForPdf(html);
                return html;
            };
            return () => {
                delete (window as any).__getCleanEditorAsunto;
            };
        }, []);

        // Normaliza al perder foco (px→pt + imágenes)
        const handleBlur = useCallback(() => {
            if (!editorRef.current?.getContents) return;
            let html = editorRef.current.getContents(true);

            // 👇 orden importa: primero tablas, luego imágenes y tamaños
            html = sanitizeTablesDeep(html);
            html = normalizeImagesHtml(html);
            html = normalizePxToPt(html);

            if (html !== editorRef.current.getContents(true)) {
                editorRef.current.setContents(html);
            }
            setData("asunto", html);
        }, [setData]);

        const commit = useCallback(() => {
            if (!editorRef.current?.getContents) return "";
            let html = editorRef.current.getContents(true);
            html = sanitizeTablesDeep(html);
            html = normalizeImagesHtml(html);
            html = normalizePxToPt(html);
            // ⬇️ quita invisibles y "?" huérfanos en TODO el documento
            html = scrubWeirdArtifacts(html);
            html = finalizeHtmlForPdf(html);
            editorRef.current.setContents(html);
            setData("asunto", html);
            return html;
        }, [setData]);

        useImperativeHandle(ref, () => ({ commit }), [commit]);
        // Estilos de imagen/figure que sí dejamos
        function keepAllowedInlineStyles(style: string) {
            const allow = new Set([
                "float",
                "display",
                "text-align",
                "vertical-align",
                "margin",
                "margin-left",
                "margin-right",
                "margin-top",
                "margin-bottom",
                "width",
                "height",
                "max-width",
            ]);
            const rules = style
                .split(";")
                .map((r) => r.trim())
                .filter(Boolean);
            const kept: string[] = [];
            for (const r of rules) {
                const [prop, ...rest] = r.split(":");
                if (!prop || rest.length === 0) continue;
                const name = prop.trim().toLowerCase();
                if (allow.has(name))
                    kept.push(`${name}:${rest.join(":").trim()}`);
            }
            return kept.join("; ");
        }
        // Normaliza imágenes (alineación y atributos ruidosos)
        function normalizeImagesHtml(html: string) {
            const doc = new DOMParser().parseFromString(html, "text/html");

            doc.querySelectorAll("figure").forEach((fig) => {
                const s = fig.getAttribute("style") || "";
                const filtered = keepAllowedInlineStyles(s);
                if (filtered) fig.setAttribute("style", filtered);
                else fig.removeAttribute("style");
            });

            doc.querySelectorAll("img").forEach((img) => {
                const origin = img.getAttribute("origin-size") || "";
                const [ow, oh] = origin.split(",").map((s) => s.trim());
                if (ow && !img.getAttribute("width"))
                    img.setAttribute("width", ow);
                if (oh && !img.getAttribute("height"))
                    img.setAttribute("height", oh);

                const s = img.getAttribute("style") || "";
                const filtered = keepAllowedInlineStyles(s);
                if (filtered) img.setAttribute("style", filtered);
                else img.removeAttribute("style");

                img.removeAttribute("origin-size");
                Array.from(img.attributes).forEach((a) => {
                    const n = a.name.toLowerCase();
                    if (n.startsWith("data-")) img.removeAttribute(a.name);
                });
            });

            return doc.body.innerHTML;
        }
        return (
            <SunEditor
                getSunEditorInstance={getSunEditorInstance}
                setContents={data.asunto}
                onChange={(value) => setData("asunto", value)}
                onBlur={commit}
                setDefaultStyle="font-family: 'SourceSansPro'; font-style: italic; font-size: 9pt;"
                setOptions={{
                    lang: sunEditorLangEs,
                    height: "27.94cm",
                    buttonList: [
                        ["undo", "redo"],
                        ["font", "fontSize", "formatBlock"],
                        ["paragraphStyle", "blockquote"],
                        [
                            "bold",
                            "underline",
                            "italic",
                            "strike",
                            "subscript",
                            "superscript",
                        ],
                        ["fontColor", "hiliteColor"],
                        ["outdent", "indent"],
                        ["align", "horizontalRule", "list", "lineHeight"],
                        ["table", "image"],
                        ["fullScreen"],
                        ["removeFormat"],
                    ],
                    font: ["SourceSansPro"],
                    fontSize: [8, 9, 10, 11],
                    defaultTag: "div",
                    minHeight: "300px",
                    showPathLabel: false,
                    strictHTMLValidation: false,
                    pasteTagsWhitelist:
                        "table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|p|br|span",
                    fontSizeUnit: "pt",
                    imageFileInput: true, // botón para subir archivo
                    imageUrlInput: true, // también permitir por URL
                    imageUploadUrl: route("oficios.uploadInlineImage", {
                        id: data.id_oficio,
                    }),
                    imageUploadHeader: {
                        "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
                        Accept: "application/json",
                    },
                    imageUploadSizeLimit: 2 * 1024 * 1024, // 2 MB, ajusta a tu gusto
                    attributesWhitelist: {
                        table: "style|border|cellpadding|cellspacing|width|height|align",
                        thead: "style",
                        tbody: "style",
                        tfoot: "style",
                        tr: "style",
                        th: "style|rowspan|colspan|width|height|align|valign",
                        td: "style|rowspan|colspan|width|height|align|valign",
                        colgroup: "style|span|width",
                        col: "style|width",
                        caption: "style",
                        p: "class|style",
                        span: "class|style",
                        figure: "class|style",
                        img: "src|alt|title|width|height|style|origin-size",
                        div: "class|style|data-align",
                        ol: "class|style|data-align",
                        li: "class|style",
                    },
                }}
            />
        );
    }
);
export default function Nuevo({
    status,
    error,
    oficio,
    directorio,
    copy,
    directorioAll,
    externos,
    files,
    destinatariosOficio,
}: {
    status?: string;
    error?: string;
    oficio: any;
    directorio: [];
    copy: Copia[];
    directorioAll: [];
    externos: [];
    files: [];
    destinatariosOficio: any[];
}) {
    const selectDirec = useRef<SelectInstance>(null);
    const [copias, setCopias] = useState<Copia[]>(copy);
    const [variables, setVariables] = useState({
        destinatarioDos: false,
        urlPdf: "",
        extension: "",
        id_usuario: 0,
        tipo_usuario: 0,
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
    const [numOficios, setNumOficios] = useState("0");

    const destRef = useRef<SelectorDestinatariosHandle>(null);
    const [seleccionados, setSeleccionados] = useState<Destinatario[]>([]);

    type DestinatarioUI = {
        id: number;
        cargo: string;
        nombre: string;
        dependencia: string;
        nivel?: string | null;
        es_interno: 0 | 1; // 1 = interno, 0 = externo
    };

    const [seleccionadosUI, setSeleccionadosUI] = useState<DestinatarioUI[]>(
        []
    );
    const [savingDest, setSavingDest] = useState(false);
    const htmlInicial = `<div>Reciba por este medio un cordial saludo, asimismo, </div>`;

    useEffect(() => {
        setData("id_oficio", oficio?.id || 0);
        formGrupal.setData("id", oficio?.id || 0);
        formDestinatarios.setData("id_oficio", oficio?.id || 0);
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

    useEffect(() => {
        if (formDestinatarios.data.tipo == "1") {
            setDestinatarios(directorioAll);
        } else if (formDestinatarios.data.tipo == "2") {
            setDestinatarios(externos);
        }
    }, [destinatariosOficio]);

    const postUno = (payload: {
        id_oficio: number;
        id: number;
        tipo: string;
    }) =>
        new Promise<void>((resolve, reject) => {
            router.post(route("oficios.saveDestinatario"), payload, {
                preserveScroll: true,
                // usa onSuccess/onError para saber si realmente guardó
                onSuccess: () => resolve(),
                onError: () => reject(new Error("falló el guardado")),
                // onFinish corre siempre; no lo uses para “éxito”
            });
        });
    // Al guardar destinatarios:
    const guardarDestinatarios = async () => {
        if (!seleccionados.length) {
            toast.error("Selecciona al menos un destinatario.");
            return;
        }
        const destinatarios = seleccionados.map((d) => ({
            id: d.id,
            tipo: d.es_interno === 1 ? "1" : "2",
        }));

        router.post(
            route("oficios.saveDestinatario"),
            {
                id_oficio: data.id_oficio,
                destinatarios,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Destinatarios guardados.`);
                    destRef.current?.clearSelected();
                },
                onError: () => toast.error("No se pudo guardar"),
            }
        );
    };

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
        asunto: oficio?.respuesta ?? htmlInicial,
        comentario: oficio?.comentario ?? "",
    });

    const editorApiRef = useRef<EditorAsuntoHandle>(null);
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        editorApiRef.current?.commit(); // 👈 pide al hijo normalizar/guardar
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

    const formDestinatarios = useForm({
        id_oficio: oficio?.id || 0,
        id: 0,
        tipo: "",
    });

    const submitDestinatario: FormEventHandler = (e) => {
        e.preventDefault();

        formDestinatarios.post(route("oficios.saveDestinatario"), {
            onSuccess: () => {
                formDestinatarios.setDefaults({
                    id_oficio: oficio?.id || 0,
                    id: 0,
                    tipo: "",
                });
                formDestinatarios.reset("id");
                selectDirec.current!.clearValue();
                toast("Correcto: Se guardo la respuesta del oficio.", {
                    style: {
                        padding: "25px",
                        color: "#fff",
                        backgroundColor: "#29bf74",
                    },
                    position: "top-center",
                });
            },
            preserveScroll: true,
        });
    };

    const delDestinatario = (id: number) => {
        Swal.fire({
            title: "¿Está seguro?",
            text: "El destinatario se eliminará permanentemente.",
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
                router.delete(route("oficios.delDestinatario", { id }), {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        toast("Correcto: Se elimino el destinatario.", {
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

        selectDirec.current!.clearValue();
        setData("destinatarioDos", tipo);

        if (tipo === "Externo") {
            formDestinatarios.setData("tipo", "2");
            setDestinatarios(externos);
        } else {
            setDestinatarios(directorioAll);
            formDestinatarios.setData("tipo", "1");
        }
    };

    const nuevoGrupal = () => {
        if (parseInt(numOficios) <= 0) {
            toast(
                "Error: Debe haber al menos un oficio para crear un oficio grupal.",
                {
                    style: {
                        padding: "25px",
                        color: "#fff",
                        backgroundColor: "#ff4d4f",
                    },
                    position: "top-center",
                }
            );
            return;
        }
        Swal.fire({
            title: "¿Está seguro?",
            text: "Se le asignaran los folios de oficio los cuales tendra que usar para el oficio grupal",
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
                router.post(
                    route(`nuevo.oficio.grupal`, {
                        numero: numOficios,
                    })
                );
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
        formGrupal.post(route("saveNuevoOficioGrupal"), {});
    };

    const handleChangeS = (e: any) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            formGrupal.setData("archivo", target.files[0]);
        }
    };

    const cleanWordContent = (html: string) => {
        return html
            .replace(/<!--\[if.*?endif\]-->/gi, "") // Comentarios condicionales de Word
            .replace(/class="?Mso.*?"?/gi, "") // Clases de Word
            .replace(/style="[^"]*"/gi, "") // Estilos inline
            .replace(/<\/?span[^>]*>/gi, "") // Spans innecesarios
            .replace(/&nbsp;/gi, " "); // Espacios no separables
    };

    return (
        <AppLayout>
            <Head>
                <title>Nuevo oficio</title>
                <meta
                    name="Nuevo oficio"
                    content="Modulo para dar de alta nuevos oficios"
                />
            </Head>
            <Fragment>
                <PageHeader
                    titles="Nuevo Oficio"
                    active="Nuevo Oficio"
                    items={[]}
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
                                            title="Individual - Masivo"
                                            hidden={
                                                oficio?.masivo == 1
                                                    ? true
                                                    : false
                                            }
                                        >
                                            <Row>
                                                <Row className="mt-5">
                                                    {oficio?.descripcion_rechazo_jefe !==
                                                        undefined &&
                                                    oficio?.descripcion_rechazo_jefe !==
                                                        null ? (
                                                        <Col
                                                            xs={12}
                                                            className="mb-5"
                                                        >
                                                            <Form.Label>
                                                                Breve
                                                                descripción del
                                                                rechazo por
                                                                parte de su jefe
                                                                de área:
                                                            </Form.Label>
                                                            <textarea
                                                                className="form-control"
                                                                value={
                                                                    oficio?.descripcion_rechazo_jefe ??
                                                                    ""
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
                                                                Breve
                                                                descripción del
                                                                rechazo por
                                                                parte de
                                                                recepción
                                                                documental:
                                                            </Form.Label>
                                                            <textarea
                                                                className="form-control"
                                                                value={
                                                                    oficio?.descripcion_rechazo_final ??
                                                                    ""
                                                                }
                                                                rows={3}
                                                                disabled
                                                            ></textarea>
                                                        </Col>
                                                    ) : null}

                                                    <Col xs={12}>
                                                        <h4>
                                                            Ingrese aquí el
                                                            cuerpo de la
                                                            respuesta del oficio
                                                        </h4>
                                                    </Col>
                                                    <Col xs={12}>
                                                        <EditorAsunto
                                                            ref={editorApiRef}
                                                            data={data}
                                                            setData={setData}
                                                            sunEditorLangEs={
                                                                sunEditorLangEs
                                                            }
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
                                                        className="mb-5 mt-5"
                                                    >
                                                        <Form.Label>
                                                            Ingrese un
                                                            comentario referente
                                                            a la respuesta del
                                                            oficio
                                                        </Form.Label>
                                                        <textarea
                                                            className="form-control"
                                                            value={
                                                                data.comentario
                                                            }
                                                            onChange={(e) =>
                                                                setData(
                                                                    "comentario",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            maxLength={1000}
                                                            rows={3}
                                                        ></textarea>
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
                                                        {/* === NUEVO: Selector de destinatarios === */}
                                                        <Col
                                                            xs={12}
                                                            className="mt-4"
                                                        >
                                                            <div className="form-group">
                                                                <label htmlFor="directorio">
                                                                    Dirigido a:
                                                                    <p className="obligatorio">
                                                                        *
                                                                    </p>
                                                                </label>
                                                                <SelectorDestinatarios
                                                                    // endpoint por default: "/api/destinatarios" (puedes omitir)
                                                                    // endpoint="/api/destinatarios"
                                                                    ref={
                                                                        destRef
                                                                    }
                                                                    endpoint={route(
                                                                        "api.destinatarios"
                                                                    )}
                                                                    initialTipo="interno"
                                                                    initialSegmento="todos"
                                                                    perPage={50}
                                                                    onChange={
                                                                        setSeleccionados
                                                                    }
                                                                />
                                                            </div>
                                                        </Col>

                                                        <Col
                                                            xs={12}
                                                            className="d-flex justify-content-end mt-3"
                                                        >
                                                            <Button
                                                                className="btn btn-primary"
                                                                onClick={
                                                                    guardarDestinatarios
                                                                }
                                                                disabled={
                                                                    savingDest
                                                                }
                                                            >
                                                                {savingDest
                                                                    ? "Guardando..."
                                                                    : "Guardar destinatarios"}
                                                            </Button>
                                                        </Col>

                                                        <Row>
                                                            <Col xs={12}>
                                                                <DataTable
                                                                    data={
                                                                        destinatariosOficio
                                                                    }
                                                                    options={{
                                                                        language,
                                                                        autoWidth:
                                                                            false,

                                                                        ordering:
                                                                            true,
                                                                    }}
                                                                    columns={[
                                                                        {
                                                                            data: "id",
                                                                            title: "Acciones",
                                                                            width: "10%",
                                                                        },
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
                                                                    ]}
                                                                    className="display table-bordered  border-bottom ancho100"
                                                                    slots={{
                                                                        0: (
                                                                            data: any,
                                                                            row: any
                                                                        ) => (
                                                                            <div className="text-center">
                                                                                <Button
                                                                                    className="btn-icon ml-1"
                                                                                    variant="danger"
                                                                                    title="Eliminar destinatario"
                                                                                    onClick={() =>
                                                                                        delDestinatario(
                                                                                            row.id
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <i className="fa fa-trash"></i>
                                                                                </Button>

                                                                                <Button
                                                                                    className="btn-icon ml-1"
                                                                                    variant="primary"
                                                                                    title="Ver oficiosss"
                                                                                    onClick={() => {
                                                                                        setVariables(
                                                                                            {
                                                                                                ...variables,
                                                                                                id_usuario:
                                                                                                    row.id_usuario,
                                                                                                tipo_usuario:
                                                                                                    row.tipo_usuario,
                                                                                            }
                                                                                        );
                                                                                        setShow(
                                                                                            true
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <i className="fa fa-file-pdf-o"></i>
                                                                                </Button>
                                                                            </div>
                                                                        ),
                                                                    }}
                                                                ></DataTable>
                                                            </Col>
                                                        </Row>
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
                                                                        "application/xml",
                                                                        "text/xml",
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
                                                                    Enviar a
                                                                    revisión
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
                                                                oficio?.descripcion_rechazo_jefe ??
                                                                ""
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
                                                                oficio?.descripcion_rechazo_final ??
                                                                ""
                                                            }
                                                            rows={3}
                                                            disabled
                                                        ></textarea>
                                                    </Col>
                                                ) : null}

                                                {oficio?.id === undefined ? (
                                                    <>
                                                        <Col
                                                            md={12}
                                                            className="d-flex justify-content-center mb-4"
                                                        >
                                                            <div className="form-group">
                                                                <label htmlFor="num_folios">
                                                                    Numero de
                                                                    oficios que
                                                                    realizara
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    name="num_folios"
                                                                    className="form-control"
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        setNumOficios(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </Col>
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
                                                    </>
                                                ) : (
                                                    <>
                                                        <Col
                                                            md={12}
                                                            className="d-flex justify-content-center mb-4 mt-4"
                                                        >
                                                            <h3>
                                                                Numero de folio:{" "}
                                                                {
                                                                    oficio.folios_masivos
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
                    urlPdf={`imprime/nuevo/pdf/${data.id_oficio}/${variables.id_usuario}/${variables.tipo_usuario}`}
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
