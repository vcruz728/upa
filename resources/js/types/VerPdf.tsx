// VerPdf.tsx
import { Worker, Viewer, SpecialZoomLevel } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";

import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { fullScreenPlugin } from "@react-pdf-viewer/full-screen";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

import { Col, Offcanvas } from "react-bootstrap";
import { getFullUrl } from "./url";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import "../../css/verpdf.css";
import { PrintIcon } from "@react-pdf-viewer/print";

type Props = {
    urlPdf: string;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    tipo?: string; // "pdf" | "png" | "jpg" ...
};

const VerPdf = ({ urlPdf, show, setShow, tipo = "pdf" }: Props) => {
    const MIN_SCALE = 0.3; // 30%: por debajo se pone en blanco
    const MAX_SCALE = 4.0; // 400% (opcional)
    const [tema, setTema] = useState<"light" | "dark">("light");
    const [printing, setPrinting] = useState(false);
    const [preparingPrint, setPreparingPrint] = useState(false);
    const printingOpenRef = useRef(false);
    const fullScreenTargetRef = useRef<HTMLDivElement | null>(null);
    const zoomPluginInstance = zoomPlugin();
    const [ver, setVer] = useState<number>(0);
    useEffect(() => {
        if (show) setVer(Date.now());
    }, [show]);

    const fileUrl = useMemo(() => {
        const raw = (urlPdf || "").trim();
        const base = /^https?:\/\//i.test(raw)
            ? raw
            : raw.startsWith("/")
            ? getFullUrl(raw)
            : raw.startsWith("files/")
            ? getFullUrl("/" + raw)
            : getFullUrl(`/files/${raw}`);
        return base + (base.includes("?") ? "&" : "?") + "_v=" + ver; // 👈
    }, [urlPdf, ver]);

    // Un solo iframe oculto para imprimir
    function ensurePrintFrame() {
        let frame = document.getElementById(
            "pdf-print-frame"
        ) as HTMLIFrameElement | null;
        if (!frame) {
            frame = document.createElement("iframe");
            frame.id = "pdf-print-frame";
            Object.assign(frame.style, {
                position: "fixed",
                right: "0",
                bottom: "0",
                width: "1px",
                height: "1px",
                border: "0",
                opacity: "0", // no uses display:none
                pointerEvents: "none",
            } as CSSStyleDeclaration);
            document.body.appendChild(frame);
        }
        return frame;
    }
    const printDirect = useCallback(() => {
        // si ya está el diálogo abierto, ignora
        if (printingOpenRef.current) return;

        const frame = ensurePrintFrame();
        setPreparingPrint(true);

        const cleanup = () => {
            printingOpenRef.current = false;
            try {
                window.removeEventListener("afterprint", onWinAfter, true);
                window.removeEventListener("focus", onWinFocus, true);
            } catch {}
        };
        const onWinAfter = () => cleanup();
        const onWinFocus = () => setTimeout(cleanup, 250);

        const onFrameLoad = () => {
            setTimeout(() => {
                try {
                    frame.contentWindow?.focus();
                    frame.contentWindow?.print();
                    // ✅ ya abrimos el diálogo: re-habilita el botón
                    setPreparingPrint(false);
                    printingOpenRef.current = true;

                    window.addEventListener("afterprint", onWinAfter, {
                        once: true,
                    });
                    window.addEventListener("focus", onWinFocus, {
                        once: true,
                    });

                    // respaldo si nada dispara
                    setTimeout(cleanup, 15000);
                } catch {
                    setPreparingPrint(false);
                    // fallback a nueva pestaña
                    const w = window.open(fileUrl, "_blank", "noopener");
                    w?.addEventListener("load", () => w.print(), {
                        once: true,
                    });
                    cleanup();
                }
            }, 600);
        };

        frame.addEventListener("load", onFrameLoad, { once: true });
        const ts = Date.now();
        frame.src =
            fileUrl + (fileUrl.includes("?") ? "&" : "?") + `_print_ts=${ts}`;
    }, [fileUrl]);

    const fsWatchdog = useRef<number | null>(null);

    const fullScreenPluginInstance = fullScreenPlugin({
        getFullScreenTarget: () => fullScreenTargetRef.current as HTMLElement,
        onEnterFullScreen: () => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.dispatchEvent(new Event("resize"));
                    zoomPluginInstance.zoomTo(SpecialZoomLevel.PageFit);
                }, 120);
            });

            // watchdog
            fsWatchdog.current = window.setTimeout(() => {
                const pages = document.querySelectorAll(
                    ".rpv-core__page-layer"
                ).length;
                if (pages === 0) {
                    // reintento suave
                    window.dispatchEvent(new Event("resize"));
                    zoomPluginInstance.zoomTo(SpecialZoomLevel.PageFit);
                }
            }, 300);
        },
        onExitFullScreen: () => {
            if (fsWatchdog.current) clearTimeout(fsWatchdog.current);
            requestAnimationFrame(() =>
                window.dispatchEvent(new Event("resize"))
            );
        },
    });
    const { EnterFullScreen } = fullScreenPluginInstance;

    useEffect(() => {
        const isDark = document.body?.classList.contains("dark-mode");
        setTema(isDark ? "dark" : "light");
    });

    const defaultLayoutPluginInstance = defaultLayoutPlugin({
        sidebarTabs: (defaultTabs) => [defaultTabs[0]],
        renderToolbar: (Toolbar) => (
            <Toolbar>
                {(slots) => {
                    const { ZoomOut, ZoomIn, Download } = slots as any;
                    const RotateLeft =
                        (slots as any).RotateBackward ??
                        (slots as any).Rotate ??
                        (() => null);
                    const RotateRight = (slots as any).RotateForward ?? null;
                    return (
                        <div className="rv-toolbar">
                            <div className="rv-toolbar__group">
                                <ZoomOut />
                                <ZoomIn />
                            </div>
                            <div className="rv-toolbar__group">
                                <RotateLeft />
                                {RotateRight && <RotateRight />}
                                <EnterFullScreen />
                                <Download />
                                <button
                                    className="rpv-core__btn"
                                    onClick={printDirect}
                                    title="Imprimir (alta calidad)"
                                >
                                    <PrintIcon />
                                </button>
                            </div>
                        </div>
                    );
                }}
            </Toolbar>
        ),
    });

    return (
        <Offcanvas
            show={show}
            onHide={() => {
                if (!printingOpenRef.current) setShow(false);
            }}
            placement="end" // <-- vuelve aquí
            backdrop="static"
            scroll={false}
            className="ancho40" // (si usas ancho custom)
        >
            <Offcanvas.Header>
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-danger"
                    download
                >
                    Descargar PDF
                </a>

                <button
                    className="btn btn-primary ms-2"
                    onClick={printDirect}
                    disabled={preparingPrint}
                >
                    {preparingPrint ? "Preparando..." : "Imprimir PDF"}
                </button>
                <Offcanvas.Title />
                <span
                    className="d-flex ms-auto"
                    onClick={() => {
                        if (!printing) setShow(false);
                    }}
                    role="button"
                    aria-label="Cerrar"
                >
                    <i className="fe fe-x ms-auto"></i>
                </span>
            </Offcanvas.Header>

            <Offcanvas.Body style={{ height: "100dvh" }}>
                {tipo.toLowerCase() === "pdf" ? (
                    <Worker workerUrl={getFullUrl(`/js/pdf.worker.min.js`)}>
                        <div
                            ref={fullScreenTargetRef}
                            className="pdf-fs-wrap"
                            style={{ height: "100%", width: "100%" }}
                        >
                            <Viewer
                                theme={{ theme: tema }}
                                fileUrl={fileUrl}
                                defaultScale={SpecialZoomLevel.PageWidth}
                                plugins={[
                                    defaultLayoutPluginInstance,
                                    fullScreenPluginInstance,
                                    zoomPluginInstance,
                                ]}
                                onZoom={(e) => {
                                    const s = Number(e.scale);
                                    if (s < MIN_SCALE)
                                        requestAnimationFrame(() =>
                                            zoomPluginInstance.zoomTo(MIN_SCALE)
                                        );
                                    else if (s > MAX_SCALE)
                                        requestAnimationFrame(() =>
                                            zoomPluginInstance.zoomTo(MAX_SCALE)
                                        );
                                }}
                            />
                        </div>
                    </Worker>
                ) : (
                    <Col className="text-center">
                        <img
                            src={fileUrl}
                            alt=""
                            style={{ maxWidth: "100%", height: "auto" }}
                        />
                    </Col>
                )}
            </Offcanvas.Body>
        </Offcanvas>
    );
};

export default VerPdf;
