# PDFX

Browser-based PDF toolkit. All 58 tools process files entirely on the client — no PDF ever leaves the device.

**Live:** https://pdfx.tools

## How it works

- The Express server only serves static files and SEO routes (sitemap, robots). It never touches PDF data.
- PDF processing runs in the browser via [pdf-lib](https://github.com/Hopding/pdf-lib) (writing), [pdf.js](https://mozilla.github.io/pdf.js/) (reading/rendering) and [fabric.js](https://fabricjs.com/) (visual editor).
- Heavy tools run in a dedicated Web Worker with automatic fallback to the main thread.

## Toolset

Merge, split, rotate, reorder, compress, watermark, page numbers, header/footer, redaction (manual + automatic email/phone/IBAN detection), OCR, crop, resize, N-up, booklet imposition, scanner effect, form extraction/filling, metadata editing, sanitization, conversions (Word/Excel/PPTX/images/text/HTML/Markdown/audio) and more. Full list: [`shared/tool-registry.ts`](shared/tool-registry.ts).

## Development

```bash
npm install
npm run dev      # http://localhost:5000
npm run check    # typecheck (tsc)
npm test         # vitest unit tests
npm run build    # production build to dist/
```

Requires Node 20+.

## Environment variables

All optional; the app builds and runs without any of them.

| Variable | Purpose |
| --- | --- |
| `VITE_PREMIUM_ENABLED` | `'1'` turns on premium gates (everything else = off). |
| `VITE_PREMIUM_FEATURES` | CSV of active gates: `ocr`, `bigfile` (>50 MB), `batch` (>5 files). |
| `VITE_PREMIUM_PUBLIC_KEY` | Ed25519 public key (64 hex) for offline license verification (`npm run license:generate`). |
| `VITE_GOOGLE_CLIENT_ID` + `VITE_GOOGLE_PICKER_KEY` | Enable the Google Drive import button (both required). |
| `VITE_DROPBOX_APP_KEY` | Enable the Dropbox import button. |
| `VITE_PLAUSIBLE_URL` + `VITE_PLAUSIBLE_DOMAIN` | Optional Plausible analytics injection. |

## Project layout

```
client/          React SPA (Vite, Tailwind, shadcn/ui)
  src/lib/       pdf-utils.ts — all PDF logic (pdf-lib + pdf.js)
  src/tools/     typed tool registry, worker routing, search index
  src/workers/   pdf-worker.ts — Web Worker entry
server/          static file serving + sitemap/robots generation
shared/          registry shared by client and server
tests/           vitest unit tests + Playwright e2e specs
```

## Privacy

Files are processed locally using WebAssembly/JS in your browser. Nothing is uploaded, stored or logged server-side.

## License

[MIT](LICENSE) © Turpalitto
