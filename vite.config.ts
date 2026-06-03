import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "fonts/**/*"],
      manifest: {
        name: "PDFX — PDF Tools",
        short_name: "PDFX",
        description:
          "Free browser-based PDF toolkit. Merge, split, compress, convert, and edit PDF files without uploading to a server.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        lang: "en",
        categories: ["utilities", "productivity"],
        icons: [
          {
            src: "/favicon.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/favicon.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // PDF/UI чанки крупные (chunkSizeWarningLimit 1800kb) — поднимаем лимит precache
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}",
        ],
        // SPA: любые навигации отдаём из index.html
        navigateFallback: "/index.html",
        // Tesseract.js тянет core/lang-данные с CDN — кэшируем для офлайн-OCR
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /(unpkg\.com|cdn\.jsdelivr\.net|tessdata)/.test(url.href),
            handler: "CacheFirst",
            options: {
              cacheName: "pdfx-cdn-cache",
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // не включаем SW в dev — избегаем агрессивного кэширования при hot reload
        enabled: false,
      },
    }),
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
