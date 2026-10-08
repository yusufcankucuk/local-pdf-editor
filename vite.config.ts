import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  worker: { format: "es" },
  optimizeDeps: { exclude: ["mupdf"], include: ["tesseract.js"] },
  server: { host: "127.0.0.1" },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          "pdf-engine": ["pdfjs-dist"],
          "pdf-writer": ["pdf-lib"],
        },
      },
    },
  },
});
