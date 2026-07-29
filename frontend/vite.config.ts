import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Бэкенд слушает http://localhost:5269 (см. Properties/launchSettings.json).
// Прокси удобен для same-origin в dev; прямой вызов тоже ок — CORS настроен на API.
const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:5269";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
      "/get-test-admin-token": { target: API_TARGET, changeOrigin: true },
      "/health": { target: API_TARGET, changeOrigin: true },
    },
  },
});
