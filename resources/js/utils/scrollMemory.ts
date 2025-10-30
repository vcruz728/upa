// resources/js/utils/scrollMemory.ts

const KEY = "vd:scroll:v2";
let manualMode = false;

type Entry = { x: number; y: number; path: string; ts: number };

export function enableManualRestoration() {
    manualMode = true;
}
export function disableManualRestoration() {
    manualMode = false;
}

export function saveScrollForCurrentPath() {
    try {
        const entry: Entry = {
            x: window.scrollX,
            y: window.scrollY,
            path: location.pathname + location.search,
            ts: Date.now(),
        };
        sessionStorage.setItem(KEY, JSON.stringify(entry));
    } catch {}
}

function instantScrollTo(x: number, y: number) {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    // Fuerza sin animación
    html.style.scrollBehavior = "auto";
    try {
        window.scrollTo({ left: x, top: y, behavior: "auto" });
    } finally {
        // restaura el estilo anterior (por si tu sitio usa smooth global)
        html.style.scrollBehavior = prev;
    }
}

export function restoreScrollForCurrentPath(maxAgeMs = 1000 * 60 * 60) {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return false;
        const { x, y, path, ts } = JSON.parse(raw) as Entry;
        if (path !== location.pathname + location.search) return false;
        if (Date.now() - ts > maxAgeMs) return false;
        instantScrollTo(x ?? 0, y ?? 0);
        return true;
    } catch {
        return false;
    }
}

// Si NO estás en manualMode, restauramos una sola vez al cargar (opcional)
(function boot() {
    if (!manualMode) {
        setTimeout(() => restoreScrollForCurrentPath(), 0);
    }
})();
