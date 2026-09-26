import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_URL = process.env.API_URL ?? "http://localhost:8080";
const USE_POLLING = process.env.VITE_USE_POLLING === "true";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 3000,
    strictPort: true,
    watch: USE_POLLING ? { usePolling: true, interval: 200 } : undefined,
    proxy: {
      "/api": { target: API_URL, changeOrigin: false },
    },
  },
});
