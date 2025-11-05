// FiltroEstatusPills.tsx
import { useEffect } from "react";

export interface FiltroEstatusPillsProps {
    value: string;
    onChange: (v: string) => void;
    // "activos" = 0..4, "historico" = 0,1,4
    variante?: "activos" | "historico";
}

function ensurePillStyles() {
    const id = "vd-filter-pills-styles-v2";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
.vd-filterbar{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:.5rem;}
.vd-filter-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;background:#eef2f6;color:#495057;border:1px solid rgba(0,0,0,.06);}

.vd-pills{display:flex;gap:.5rem;flex-wrap:wrap;}
.vd-pill{
  --ring: rgba(0,0,0,.06);
  border-radius:999px;padding:.35rem .7rem;border:1px solid rgba(0,0,0,.08);
  background:#f8f9fb;display:inline-flex;align-items:center;gap:.45rem;
  font-weight:700;font-size:.85rem;cursor:pointer;user-select:none;
  transition:transform .12s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;
}
.vd-pill .vd-dot{width:.6rem;height:.6rem;border-radius:50%;}
.vd-pill:hover{transform:translateY(-1px);box-shadow:0 1px 2px rgba(0,0,0,.06);}

/* Colores por estado */
.vd-pill.-all { --c:#6c757d; }
.vd-pill.-c1  { --c:#5FD710; } /* en tiempo   */
.vd-pill.-c2  { --c:#F5F233; } /* sin resp en tiempo */
.vd-pill.-c3  { --c:#F98200; } /* sin resp fuera */
.vd-pill.-c4  { --c:#FF2D2D; } /* resp fuera */

.vd-pill .vd-dot{ background: var(--c); }

/* Activo MUY visible */
.vd-pill.is-active{
  background: #fff; /* base clara */
  border-color: var(--c);
  box-shadow: 0 0 0 3px var(--ring), inset 0 0 0 999px color-mix(in srgb, var(--c) 18%, white);
}
/* Fallback por si el navegador no soporta color-mix */
@supports not (color-mix(in srgb, red 50%, white)) {
  .vd-pill.-c1.is-active{ background:#EAF6DD; }
  .vd-pill.-c2.is-active{ background:#FFF7B8; }
  .vd-pill.-c3.is-active{ background:#FFE0C4; }
  .vd-pill.-c4.is-active{ background:#FFD1D1; }
  .vd-pill.-all.is-active{ background:#ECEFF3; }
}
.vd-pill:focus-visible{ outline:3px solid var(--c); outline-offset:2px; }
`;
    document.head.appendChild(s);
}

const FiltroEstatusPills = ({
    value,
    onChange,
    variante = "activos",
}: FiltroEstatusPillsProps) => {
    useEffect(() => ensurePillStyles(), []);

    const base = [
        { v: "0", txt: "Todos", cls: "-all" },
        { v: "1", txt: "Se dio respuesta en tiempo", cls: "-c1" },
        { v: "2", txt: "Sin respuesta, en tiempo", cls: "-c2" },
        { v: "3", txt: "Sin respuesta, fuera de tiempo", cls: "-c3" },
        { v: "4", txt: "Se dio respuesta fuera de tiempo", cls: "-c4" },
    ];
    const opts =
        variante === "historico"
            ? base.filter((o) => ["0", "1", "4"].includes(o.v))
            : base;

    return (
        <div className="vd-filterbar">
            <span
                className="vd-filter-icon"
                title="Filtrar por estatus"
                aria-hidden="true"
            >
                <i className="fe fe-filter" />
            </span>

            <div className="vd-pills">
                {opts.map((o) => {
                    const active = value === o.v;
                    return (
                        <button
                            key={o.v}
                            type="button"
                            className={`vd-pill ${o.cls} ${
                                active ? "is-active" : ""
                            }`}
                            onClick={() => onChange(o.v)}
                            aria-pressed={active}
                        >
                            <span className="vd-dot" />
                            <span className="vd-pill-text">{o.txt}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default FiltroEstatusPills;
