# Contributing to PDFX

Thanks for helping improve PDFX — the privacy-first, browser-based PDF toolkit.

## Ground rules

- **All PDF processing happens in the browser.** The server serves static assets only. Never add server-side PDF handling.
- **Light theme only.** Do not change the CSS variable palette in `client/src/index.css` or `categoryColors` in `client/src/lib/tools.ts`.
- **Translations: EN + RU only** for new strings (`client/src/lib/i18n.ts`, `client/src/lib/tool-translations.ts`). Other languages are frozen.
- **TypeScript must compile with zero errors** (`npx tsc --noEmit`).

See `AGENTS.md` for the full protocol, including the new-tool checklist.

## Setup

```bash
npm install
npm run dev        # http://localhost:5000
```

## Before opening a PR

Run the full verification suite and make sure everything is green:

```bash
npm run check      # tsc --noEmit
npm run lint       # eslint
npm test           # vitest (unit tests, incl. converter golden tests)
npm run build      # production build
npx playwright test tests/e2e   # e2e (needs a free port: PORT=5057 npx playwright test)
```

Notes:

- On macOS, port 5000 can be taken by Control Center — run the dev server and e2e on another port (`PORT=5057`).
- OCR e2e tests are skipped unless `RUN_OCR_E2E=1` is set.
- `npm run build:full` additionally prerenders all 64 routes for SEO (requires Playwright chromium).

## Adding a tool

Follow the checklist in `AGENTS.md`: registry entry in `tools.ts`, implementation in `pdf-utils.ts` (check for duplicate exports first), UI case in `tool-page.tsx`, EN/RU translations, then the full verification suite above.

## Commit style

Conventional commits (`fix:`, `feat:`, `chore:`, `style:`, `docs:`), short imperative subject lines.
