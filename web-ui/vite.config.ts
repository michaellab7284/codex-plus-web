import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        host: "0.0.0.0",
        port: 1420,
        strictPort: true,
        proxy: {
            "/api": {
                target: "http://localhost:39901",
                changeOrigin: true,
            },
            "/ws": {
                target: "ws://localhost:39901",
                ws: true,
            },
        },
    },
});
