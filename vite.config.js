import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";

export default defineConfig({
    // base: "https://procesosacademicos.buap.mx/upa/public/build/",
    base: "http://localhost/upa/public/build/",
    // base: "/build/",

    plugins: [
        laravel({
            input: "resources/js/app.tsx",
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: true, // útil en WSL/Docker
        hmr: { host: "localhost" }, // ajusta si accedes desde otra IP
        watch: { usePolling: true, interval: 300 }, // en WSL/Docker/VM
    },
});
