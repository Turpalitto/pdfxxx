import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("pdfjs-dist")) {
            return "pdfjs";
          }

          if (id.includes("pdf-lib") || id.includes("@pdf-lib/fontkit")) {
            return "pdf-lib";
          }

          if (id.includes("mammoth")) {
            return "office";
          }

          if (id.includes("jszip")) {
            return "zip-utils";
          }

          if (id.includes("fabric") || id.includes("tesseract.js")) {
            return "pdf-advanced";
          }

          if (id.includes("framer-motion")) {
            return "motion";
          }

          if (id.includes("@radix-ui") || id.includes("lucide-react")) {
            return "ui-kit";
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
