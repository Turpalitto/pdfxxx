import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createReadStream } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { VitePWA } from 'vite-plugin-pwa';

// Путь в dist/public: emitFile с fileName кладёт ассеты в корень outDir,
// а не в assetsDir — поэтому префикс без `/assets`.
const PDFJS_ASSET_PREFIX = '/pdfjs/standard_fonts/';

/**
 * Раздаёт `pdfjs-dist/standard_fonts` по HTTP — pdfjs грузит оттуда
 * стандартные 14 шрифтов (Helvetica/Times/Courier…), без чего падает
 * `standardFontDataUrl` и ломается текстовый слой части PDF.
 * В dev — middleware, при сборке — emit в dist/public.
 */
function pdfjsAssets(): Plugin {
  const fontsDir = path.resolve(import.meta.dirname, 'node_modules/pdfjs-dist/standard_fonts');
  let isBuild = false;

  return {
    name: 'pdfx:pdfjs-assets',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith(PDFJS_ASSET_PREFIX)) return next();

        const name = path.basename(decodeURIComponent(url.slice(PDFJS_ASSET_PREFIX.length)));
        const file = path.join(fontsDir, name);
        stat(file).then(
          (info) => {
            if (!info.isFile()) return next();
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            createReadStream(file).pipe(res);
          },
          () => next(),
        );
      });
    },
    // В dev ассеты раздаёт middleware выше, а emitFile() в serve-режиме Vite
    // не поддерживает (и ругается в лог) — поэтому гард по command.
    async buildStart() {
      if (!isBuild) return;
      const dir = await readdir(fontsDir);
      for (const name of dir) {
        if (!name.endsWith('.pfb') && !name.endsWith('.ttf')) continue;
        this.emitFile({
          type: 'asset',
          fileName: `pdfjs/standard_fonts/${name}`,
          source: await readFile(path.join(fontsDir, name)),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    pdfjsAssets(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'fonts/**/*'],
      manifest: {
        name: 'PDFX — PDF Tools',
        short_name: 'PDFX',
        description:
          'Free browser-based PDF toolkit. Merge, split, compress, convert, and edit PDF files without uploading to a server.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        lang: 'en',
        categories: ['utilities', 'productivity'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Прекэш — только оболочка и лёгкие чанки. Тяжёлые PDF/OCR-библиотеки
        // (pdfjs/pdf-lib/fabric/tesseract/mammoth/xlsx/jszip) грузятся по
        // требованию и кэшируются через runtimeCaching после первого использования.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}'],
        globIgnores: [
          '**/assets/pdfjs-*.js',
          '**/assets/pdf-*.js',
          '**/assets/pdf-advanced-*.js',
          '**/assets/office-*.js',
          '**/assets/xlsx-*.js',
          '**/assets/zip-utils-*.js',
          '**/assets/pdf.worker-*.mjs',
          '**/assets/pdf-worker-*.js',
          '**/fonts/*.ttf',
          '**/og-image.png',
        ],
        // SPA: любые навигации отдаём из index.html
        navigateFallback: '/index.html',
        // Tesseract.js тянет core/lang-данные с CDN — кэшируем для офлайн-OCR
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /(unpkg\.com|cdn\.jsdelivr\.net|tessdata)/.test(url.href),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfx-cdn-cache',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/assets/') ||
              url.pathname.startsWith('/fonts/') ||
              url.pathname.startsWith(PDFJS_ASSET_PREFIX),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfx-assets-cache',
              expiration: {
                maxEntries: 60,
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
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  root: path.resolve(import.meta.dirname, 'client'),
  // PDF-воркер (client/src/workers/pdf-worker.ts) тянет dynamic import() из
  // pdf-utils → code-splitting. Дефолтный worker.format "iife" его не
  // поддерживает, поэтому собираем воркеры как ES-модули.
  worker: {
    format: 'es',
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('pdfjs-dist')) {
            return 'pdfjs';
          }

          if (id.includes('pdf-lib') || id.includes('@pdf-lib/fontkit')) {
            return 'pdf-lib';
          }

          if (id.includes('mammoth')) {
            return 'office';
          }

          if (id.includes('jszip')) {
            return 'zip-utils';
          }

          if (id.includes('fabric') || id.includes('tesseract.js')) {
            return 'pdf-advanced';
          }

          if (id.includes('framer-motion')) {
            return 'motion';
          }

          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'ui-kit';
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
});
