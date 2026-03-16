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
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("react") ||
            id.includes("scheduler") ||
            id.includes("wouter") ||
            id.includes("@tanstack/react-query")
          ) {
            return "framework";
          }

          if (id.includes("@radix-ui")) {
            return "radix";
          }

          if (id.includes("framer-motion")) {
            return "motion";
          }

          if (
            id.includes("pdf-lib") ||
            id.includes("@pdf-lib") ||
            id.includes("pdfjs-dist") ||
            id.includes("jszip") ||
            id.includes("mammoth") ||
            id.includes("xlsx")
          ) {
            return "pdf-core";
          }

          if (id.includes("fabric")) {
            return "pdf-editor";
          }

          if (id.includes("tesseract.js")) {
            return "ocr";
          }

          return "vendor";
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
