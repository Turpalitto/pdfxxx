# PDFX Audit Before Refactor

> Baseline before the staged product/refactor work. Date: 2026-06-20.

## Repository State

- Repository: `https://github.com/Turpalitto/pdfxxx`
- Branch: `main`
- Git status at start: clean against `origin/main`, with local untracked artifacts: `.e2e-out.txt`, `screenshot-home.png`, `screenshot-ocr.png`
- Node: `v24.14.0`
- npm: `11.9.0`
- `npm install`: passed, dependencies already up to date
- npm audit baseline: 3 vulnerabilities reported by npm install (1 low, 1 moderate, 1 high)

## Verification Baseline

- `npm run check`: passed
- `npm test`: passed, 1 test file, 70 tests
- `npm run build`: passed
- `npx playwright install chromium`: passed
- `npm run test:e2e`: passed, 47 passed, 3 skipped

Build notes:

- PWA generation passed: 51 precache entries, 7086.03 KiB
- Server bundle: `dist/index.cjs`, 819.9 kB
- Build emitted an existing PostCSS warning: a plugin did not pass the `from` option to `postcss.parse`

## Product Inventory

- Tools: 58
- Categories: 7
- Category counts: `convert-from` 11, `convert-to` 4, `organize` 15, `security` 7, `optimize` 1, `ocr` 2, `utility` 18
- Stable/Beta/Experimental maturity fields: not implemented yet
- Existing flags: `beta` 0, `pro` 1 (`redact-pdf`)

## Worker Baseline

Worker operation types currently declared:

- `grayscalePdf`
- `invertColors`
- `pdfToImages`
- `scannerEffect`
- `removeBlankPages`
- `nUpPdf`
- `toSinglePage`
- `bookletImposition`
- `comparePdf`
- `autoRedactPdf`
- `pdfDiff`
- `redactPdf`
- `pdfToPptx`
- `ocrPdf`

E2E confirms the worker path for worker-backed tools, including worker spawn, cancel behavior, two-file worker tools, redact/auto-redact, and `pdf-to-pptx`.

Main-thread tool-page cases still include many non-worker paths, including file organization, regular PDF edits, office/text conversions, metadata/sanitize/extract flows, background/overlay, split-by-size, and audio/markdown exports.

## Size Baseline

Source files:

- `client/src/pages/tool-page.tsx`: 2316 lines, 112455 bytes
- `client/src/pages/edit-pdf-page.tsx`: 2733 lines, 114337 bytes
- `client/src/lib/pdf-utils.ts`: 3922 lines, 153921 bytes

Largest production assets:

- `pdf.worker-CliDBb4N.mjs`: 2174484 bytes
- `pdf.worker.min-B_fnEKel.mjs`: 1239047 bytes
- `pdf-worker-DZvtjj3s.js`: 1175476 bytes
- `pdf-lib-CWT8gS0T.js`: 1155400 bytes
- `file-upload-CSHXRX1Q.js`: 1029490 bytes
- `xlsx-CKwrMZHi.js`: 499549 bytes
- `pdf-vkbVaD7t.js`: 405701 bytes
- `pdfjs-vkbVaD7t.js`: 405701 bytes
- `office-Do93Uv3F.js`: 404648 bytes
- `pptxgen.es-BAElSFEs.js`: 372044 bytes
- `pdf-advanced-D-uoHMfN.js`: 324456 bytes
- `pptxgen.es-BPaOdzpQ.js`: 275034 bytes

## Storage And Runtime Requests

Observed localStorage keys:

- `pdfx_recent_files`
- `pdfx-recent-tools`
- `pdfx-lang`
- `pdfx-theme` is removed by the current theme layer

Observed runtime/network surfaces:

- Server-side static sitemap base URL: `https://pdfx.tools`
- SEO canonical/schema URL base: `https://pdfx.tools`
- Local font fetch: `/fonts/NotoSans-Regular.ttf`
- Generic query client can call relative app endpoints
- Worker creation: `new Worker(new URL("./pdf-worker.ts", import.meta.url), { type: "module" })`

Current CSP in `server/index.ts`:

- `script-src 'self' 'wasm-unsafe-eval'`
- `img-src 'self' data: blob:`
- `font-src 'self' data:`
- `connect-src 'self' blob: data:`
- `worker-src 'self' blob:`

## File Size Limits

- Shared default: `DEFAULT_MAX_FILE_SIZE_MB = 500`
- `tool-page.tsx` uses `tool.maxFilesMb ?? DEFAULT_MAX_FILE_SIZE_MB`
- `edit-pdf-page.tsx` uses the same 500 MB limit through `MAX_EDIT_PDF_FILE_SIZE_MB`
- Limits are static, not yet risk-estimated dynamically per operation/device

## Known Baseline Issues

- Debug logs remain in `client/src/pages/tool-page.tsx` around preview generation.
- `pdfx_recent_files` stores recent file metadata in localStorage; privacy behavior needs review against the new plan.
- No explicit Stable/Beta/Experimental maturity model exists yet.
- `tool-page.tsx` and `pdf-utils.ts` remain large central files.
- Some heavy or complex operations still run from main-thread paths.
- Build has large PDF/PDF worker chunks; no explicit budget report is committed yet.
- npm audit reports 3 vulnerabilities; no dependency remediation was performed during baseline capture.
- PostCSS emits a warning about a missing `from` option during build/e2e webServer startup.

## Round 1 Candidates

- Remove preview debug logs.
- Review and reduce recent-files privacy exposure.
- Ensure privacy policy matches actual localStorage behavior.
- Add `/workflow` to sitemap verification if not already covered.
- Add explicit maturity metadata without changing public tool URLs.
- Add a first dynamic/risk limit layer around the existing 500 MB static limit.
- Keep palette lock intact; no `index.css` or `categoryColors` changes are needed for Round 1.
