<!--
  AUTO-READ: This file is the primary context document for AI agents.
  Read this ENTIRE file before making any code changes.
  Last updated: 2026-05-30
-->
# AGENT.md — PDFX Project Guide

> This file is written for AI agents (Gemini, Claude, GPT, Codex, etc.).  
> Read it fully before making any changes. It describes the architecture, all tools, key files, rules, and what has already been built.

---

## 1. What Is PDFX?

**PDFX** is a **100% browser-based PDF toolbox** — no server-side PDF processing, no file uploads to any backend. All PDF operations run locally in the user's browser using:

- [`pdf-lib`](https://pdf-lib.js.org/) — create, modify, embed pages, draw shapes, save PDFs
- [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) — render pages to canvas, extract text, read outline/bookmarks
- [`jszip`](https://stuk.github.io/jszip/) — pack multiple files into ZIP archives
- [`fabric`](http://fabricjs.com/) — interactive canvas editor (used in `edit-pdf`)
- [`tesseract.js`](https://tesseract.projectnaptha.com/) — OCR in the browser

The stack is **React + TypeScript + Vite + Tailwind CSS + shadcn/ui**, served by an Express.js backend that only serves the static SPA — it does **zero** PDF processing.

---

## 2. Project Structure

```
c:\pdfxxx\
├── client/                     # All frontend code (React SPA)
│   ├── index.html
│   └── src/
│       ├── App.tsx             # Router (wouter), all page routes
│       ├── main.tsx            # Entry point
│       ├── index.css           # Global styles + CSS variables (DO NOT change color palette)
│       ├── lib/
│       │   ├── tools.ts        # ← MASTER TOOL REGISTRY: all tools defined here
│       │   ├── tool-translations.ts  # ← All tool names/descriptions in 20 languages
│       │   ├── pdf-utils.ts    # ← ALL PDF utility functions (the core engine)
│       │   ├── i18n.ts         # UI string translations (not tool names)
│       │   ├── lang-context.tsx # Language context provider
│       │   ├── tool-experience.ts  # Workflow/sidebar suggestions per tool
│       │   ├── upload-limits.ts    # File size limits per tool
│       │   ├── utils.ts        # Generic helpers (cn, clamp, etc.)
│       │   ├── theme.tsx       # Dark/light mode
│       │   └── route-preload.ts
│       ├── pages/
│       │   ├── home.tsx        # Home page: tool grid, categories, search
│       │   ├── tool-page.tsx   # ← UNIVERSAL TOOL PAGE: handles ALL tools except edit-pdf
│       │   ├── edit-pdf-page.tsx  # ← SPECIAL: Fabric.js canvas editor (3500+ lines)
│       │   ├── pricing.tsx
│       │   ├── contact.tsx
│       │   ├── privacy.tsx
│       │   ├── terms.tsx
│       │   └── not-found.tsx
│       ├── components/
│       │   ├── navbar.tsx
│       │   ├── footer.tsx
│       │   ├── file-upload.tsx  # Drag-and-drop uploader component
│       │   ├── tool-card.tsx    # Tool grid card
│       │   ├── page-thumbnails.tsx  # PDF page thumbnails (delete/extract/reorder)
│       │   ├── page-selector.tsx
│       │   ├── progress-ring.tsx
│       │   └── animated-background.tsx
│       └── hooks/
│           ├── use-seo.ts
│           ├── use-toast.ts
│           └── use-mobile.tsx
├── server/
│   └── index.ts               # Express: serves /dist, handles 404 → index.html
├── shared/                    # Shared types (if any)
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. How to Run

```bash
# Development (hot reload, port 5000)
npm run dev

# TypeScript check (always run before committing)
npx tsc --noEmit

# Production build
npm run build
```

Server starts at `http://localhost:5000`.

---

## 4. Core Concept: Tool Registry (`tools.ts`)

Every tool is defined as a `Tool` object in `client/src/lib/tools.ts`:

```typescript
{
  slug: "crop-pdf",           // URL: /tools/crop-pdf
  name: "Crop PDF",           // Displayed in EN
  description: "...",
  icon: Crop,                 // Lucide icon component
  emoji: "✂️",
  category: "organize",       // organize | convert-from | convert-to | security | utility | ocr | optimize
  color: "teal",              // blue|violet|green|orange|teal|indigo|amber|rose|sky|slate
  accept: ".pdf",             // or ".pdf,.docx" etc.
  outputExt: "pdf",           // pdf | txt | docx | zip | html | jpg | png | xlsx
}
```

**To add a new tool:**
1. Add entry to `tools.ts`
2. Add case in `tool-page.tsx` → `handleProcess` switch
3. Add utility function to `pdf-utils.ts` (if needed)
4. Add EN+RU translations to `tool-translations.ts`
5. Optionally add UI controls in `tool-page.tsx` JSX

---

## 5. Complete Tool List (44 tools total)

### Convert FROM PDF
| Slug | Output | Engine |
|------|--------|--------|
| `pdf-to-word` | docx | pdfjs + html |
| `pdf-to-jpg` | zip of jpgs | pdfjs canvas |
| `pdf-to-png` | zip of pngs | pdfjs canvas |
| `pdf-to-text` | txt | pdfjs getTextContent |
| `pdf-to-html` | html | pdfjs text layer |
| `pdf-to-excel` | xlsx | pdfjs + SheetJS |

### Convert TO PDF
| Slug | Input | Engine |
|------|-------|--------|
| `word-to-pdf` | docx | mammoth + pdf-lib |
| `images-to-pdf` | jpg/png | pdf-lib embedImage |
| `excel-to-pdf` | xlsx | SheetJS + pdf-lib |
| `text-to-pdf` | txt | pdf-lib |
| `photo-to-pdf` | jpg/png | pdf-lib |

### Organize
| Slug | What it does |
|------|-------------|
| `merge-pdf` | Merge multiple PDFs into one |
| `split-pdf` | Split by range, every N pages, or all pages → ZIP |
| `split-by-size` | Split into parts ≤ N MB → ZIP |
| `rotate-pdf` | Rotate all pages 90/180/270° |
| `delete-pages` | Delete specific pages (visual thumbnails) |
| `reorder-pages` | Drag-and-drop page reordering (thumbnails) |
| `extract-pages` | Extract page range as new PDF |
| `crop-pdf` | Trim margins in mm (top/right/bottom/left) |
| `n-up-pdf` | 2-up or 4-up pages per A4 sheet |
| `compare-pdf` | Side-by-side visual comparison of two PDFs |
| `remove-blank-pages` | Auto-detect and remove blank pages (97%+ white pixels) |
| `resize-pages` | Scale all pages to A4/A3/A5/Letter/Legal/Tabloid |

### Security
| Slug | What it does |
|------|-------------|
| `protect-pdf` | Password-encrypt with AES-256 |
| `unlock-pdf` | Remove PDF password |
| `sign-pdf` | Draw signature and embed as image |
| `redact-pdf` | Manual text redaction (black boxes) |
| `auto-redact` | Auto-redact emails/phones/SSN/IBAN/custom regex |

### Optimize / Utility
| Slug | What it does |
|------|-------------|
| `compress-pdf` | Reduce file size (3 levels: low/medium/high) |
| `repair-pdf` | Re-parse and re-save a damaged PDF |
| `flatten-pdf` | Flatten AcroForm fields → static text |
| `grayscale-pdf` | Convert color PDF to grayscale via canvas |
| `overlay-pdf` | Overlay one PDF on top of another (opacity slider) |
| `pdf-metadata` | View and edit Title/Author/Subject/Keywords |
| `pdf-bookmarks` | View PDF outline/TOC, export as TXT |

### OCR / Scan
| Slug | What it does |
|------|-------------|
| `ocr-pdf` | OCR scanned PDF → searchable PDF (Tesseract.js) |

### Edit (special page)
| Slug | What it does |
|------|-------------|
| `edit-pdf` | Full canvas editor: text, draw, shapes, highlight, signatures, eraser, zoom, undo/redo, Find & Replace (Ctrl+F) |

### Enrich
| Slug | What it does |
|------|-------------|
| `watermark-pdf` | Add text or image watermark |
| `pdf-page-numbers` | Add page numbers (position, format, start from) |
| `pdf-header-footer` | Custom header/footer text |
| `extract-images` | Extract all pages as PNG/JPG → ZIP |

---

## 6. Key Files Deep Dive

### `client/src/lib/pdf-utils.ts` (~2300 lines)

All PDF logic lives here. Key exports:

```typescript
// Core
compressPdf(file, level)                    → Uint8Array
mergePdfs(files)                            → Uint8Array
splitPdf(file, options)                     → Uint8Array | Uint8Array[]
rotatePdf(file, degrees)                    → Uint8Array
cropPdf(file, margins: {top,right,bottom,left})  → Uint8Array
grayscalePdf(file, onProgress?)            → Uint8Array
resizePages(file, preset, fit)             → Uint8Array
removeBlankPages(file, threshold, fraction, onProgress?) → Uint8Array
repairPdf(file)                            → Uint8Array
flattenPdf(file)                           → Uint8Array
nUpPdf(file, layout: 2|4, onProgress?)    → Uint8Array
splitBySize(file, maxMb, onProgress?)      → {name, bytes}[]
overlayPdf(baseFile, overlayFile, opacity, onProgress?) → Uint8Array
autoRedactPdf(file, patterns, customRegex?, onProgress?) → Uint8Array

// Edit
addWatermark(file, options)                → Uint8Array
addPageNumbers(file, options)              → Uint8Array
addHeaderFooter(file, options)             → Uint8Array
protectPdf(file, password)                → Uint8Array
unlockPdf(file, password)                 → Uint8Array
signPdf(file, signatureDataUrl, options)  → Uint8Array
redactPdf(file, searchText)              → Uint8Array

// OCR
ocrPdf(file, language, onProgress?)      → Uint8Array

// Convert
pdfToImages(file, fmt, scale)            → {dataUrl, page}[]
pdfToHtml(file)                          → string
pdfToWord(file)                          → Uint8Array (docx)
extractImages(file, format, onProgress?) → Uint8Array (ZIP)

// Metadata
readPdfMetadata(file)                    → PdfMetadata
writePdfMetadata(file, meta)             → Uint8Array
getPdfBookmarks(file)                    → PdfBookmark[]
bookmarksToText(bookmarks)               → string

// Info
getPdfPageCount(file)                    → number
getPdfPageThumbnails(file, scale, maxPages?) → string[] (dataURLs)

// Helpers
downloadBlob(bytes, filename, mimeType)
downloadText(text, filename)
formatBytes(bytes)                        → string "1.2 MB"
parsePageSelection(input, pageCount)      → number[]
```

### `client/src/pages/tool-page.tsx` (~1800 lines)

**Universal tool handler.** One page that handles all tools except `edit-pdf`.

Key sections:
- **State**: file list, progress, result bytes, per-tool options (watermark text, password, crop margins, resize preset, redact patterns, etc.)
- **`handleProcess()`**: large `switch(slug)` calling the right pdf-utils function
- **`handleDownload()`**: routes to correct download method (PDF, ZIP, TXT, etc.)
- **JSX**: file upload area + tool-specific controls + progress + result
- **Sidebar**: "How to use" steps + "Similar tools" + workflow suggestions

**When adding a new tool**, search for `// ==================== COMPRESS result metric` — insert your UI block before it.

### `client/src/pages/edit-pdf-page.tsx` (~3500 lines)

**Fabric.js canvas editor.** Does NOT use `tool-page.tsx`.

Features:
- Tools: Select, Text, Draw, Highlight, Rectangle, Circle, Line, Eraser, Image, Signature
- Zoom, Undo/Redo (history stack)
- Page thumbnails sidebar
- **Find & Replace** (Ctrl+F): searches `pageTextLinesRef`, highlights matches with colored rects, replaces with white mask + Textbox
- Keyboard shortcuts: V/T/B/H/R/C/L/E for tools, Ctrl+Z/Y/S/B/I/U/D/C/V/F
- Saves per-page Fabric JSON state, exports via pdf-lib

### `client/src/lib/tools.ts`

Tool registry + `categoryColors` palette. **Do not add new colors** — use existing: `blue, violet, green, orange, teal, indigo, amber, rose, sky, slate`.

### `client/src/lib/tool-translations.ts`

Structure:
```typescript
const en: ToolTranslationMap = { "slug": { name: "...", description: "..." }, ... };
const ru: ToolTranslationMap = { ... };
// + es, fr, de, zh, pt, it, uk, pl, ja, ko, ar, tr, vi, id, th, cs
export const toolTranslations: Record<string, ToolTranslationMap> = { en, ru, es, ... };
```

**Rule:** When adding a new tool, add translations at minimum for `en` and `ru`. Other languages already have entries for all tools added before October 2025; newer tools can fall back to slug.

### `client/src/lib/tool-experience.ts`

Defines workflow suggestions in the sidebar per tool:
```typescript
export const toolExperiences: Record<string, ToolExperience> = {
  "compress-pdf": {
    workflows: [{ label: "Prepare for email", tools: ["compress-pdf", "watermark-pdf"] }],
    relatedTools: ["merge-pdf", "split-pdf"],
  },
  ...
};
```

---

## 7. Language System

- Supported: **en, ru, es, fr, de, zh, pt, it, uk, pl, ja, ko, ar, tr, vi, id, th, cs** (18 languages)
- Language stored in `localStorage` and `LangContext`
- UI strings: `client/src/lib/i18n.ts` (use `useLang()` → `t.someKey`)
- Tool names/descriptions: `tool-translations.ts` (use `getToolTranslation(slug, lang)`)
- **Active languages for new development: EN + RU only.** Other languages were pre-populated from Stirling-PDF.

---

## 8. Styling Rules

> **DO NOT change the color palette or background tones.**

- Colors defined in `index.css` as CSS variables (`--background`, `--foreground`, `--pdfx-panel`, etc.)
- Dark/sepia/light theme toggle via `ThemeProvider`
- Tailwind + shadcn/ui components
- Tool card colors are pastel/translucent: `bg-blue-500/10`, `text-blue-400`, etc.
- Do not use plain `red`, `blue`, `green` — always use the muted/HSL variants

---

## 9. PDF Processing Architecture

```
User uploads file → FileUpload component → files[] state
→ handleProcess() called
  → pdf-utils function (runs in browser main thread)
  → result = Uint8Array
→ handleDownload() called
  → downloadBlob() / downloadText() triggers browser download
```

**Important:**
- All PDF functions are **async** (lazy-load pdfjs/fabric with dynamic `import()`)
- Progress callbacks: `setProgress(0..100)` passed to long operations
- `pdfjs-dist` is loaded once and cached via `loadPdfJs()` helper in pdf-utils
- File size limits defined in `upload-limits.ts`

---

## 10. What Was Built in This Session

This project started as a basic PDF tool app and was upgraded by analyzing [Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF) (a Java/server-based PDF suite) and porting feasible features to the browser.

### Round 1 — New Tools
| Tool | Category | Key function |
|------|----------|-------------|
| `crop-pdf` | organize | `cropPdf()` — pdf-lib MediaBox manipulation |
| `extract-images` | convert-from | `extractImages()` — pdfjs canvas → ZIP |
| `pdf-metadata` | utility | `readPdfMetadata()`, `writePdfMetadata()` |

### Round 2 — UX Upgrades
- **Page thumbnails** on `delete-pages`, `extract-pages`, `reorder-pages` — visual page selection
- **Compress metrics** — shows "Saved X KB (Y%)" after compression
- **3 new workflow suggestions** in sidebar: "Extract content", "Anonymize document", "Prepare for print"

### Round 3 — More Tools
| Tool | Category | Key function |
|------|----------|-------------|
| `compare-pdf` | organize | Side-by-side thumbnail comparison |
| `remove-blank-pages` | organize | Canvas pixel analysis (97% white = blank) |
| `resize-pages` | organize | `pdf-lib embedPages()` + scale to A4/A3/Letter etc. |
| `grayscale-pdf` | utility | Canvas render + pixel grayscale + re-embed as JPEG |
| `pdf-bookmarks` | utility | `pdfjs getOutline()` → TXT export |

### Round 4 — Find & Replace in Edit PDF
- Ctrl+F opens floating search bar above canvas
- Searches `pageTextLinesRef` (already parsed by `extractTextLines()`)
- Yellow highlight rects for matches, orange for current
- "Replace" = white rect mask + new Fabric Textbox
- "Replace All" batch mode
- Located in `edit-pdf-page.tsx` — functions: `findInPage`, `navigateFindMatch`, `replaceCurrentMatch`, `replaceAllMatches`, `clearFindHighlights`

### Round 5 — 6 More Tools (no backend)
| Tool | Category | Key function |
|------|----------|-------------|
| `repair-pdf` | utility | `repairPdf()` — re-parse with ignoreEncryption + throwOnInvalidObject:false |
| `flatten-pdf` | utility | `flattenPdf()` — `pdf-lib form.flatten()` |
| `auto-redact` | security | `autoRedactPdf()` — regex patterns on text layer, black rect overlay |
| `n-up-pdf` | organize | `nUpPdf()` — tiling 2 or 4 pages per A4 sheet |
| `split-by-size` | organize | `splitBySize()` — binary search optimal chunk → ZIP |
| `overlay-pdf` | utility | `overlayPdf()` — embed overlay PDF with opacity |

---

## 11. Hard Rules for AI Agents

1. **Never change color palette** (`index.css` CSS variables, `categoryColors` in tools.ts)
2. **Never add backend PDF processing** — everything runs in-browser
3. **TypeScript must compile**: always run `npx tsc --noEmit` after changes — **0 errors required**
4. **No new npm packages without asking** — all needed libs already installed
5. **Active languages = EN + RU** — other langs have their own entries, don't break them
6. **No duplicate tool slugs** — check before adding
7. **No duplicate exports** in `pdf-utils.ts` — check before adding functions
8. `edit-pdf-page.tsx` is standalone — it does NOT use `tool-page.tsx`
9. UI blocks for new tools go in `tool-page.tsx` JSX — insert before `{/* COMPRESS result metric */}` comment
10. Switch cases for new tools go in `handleProcess()` — insert before `case "compare-pdf":`

---

## 12. Adding a New Tool — Step-by-Step Checklist

```
[ ] 1. Add tool object to tools.ts (unique slug, existing color, icon from lucide-react)
[ ] 2. Add utility function to pdf-utils.ts (check for duplicates first)
[ ] 3. Add state vars to tool-page.tsx (after resizeFit state block)
[ ] 4. Add switch case in handleProcess() before "compare-pdf" case
[ ] 5. If ZIP output: add download handler before split-pdf download handler
[ ] 6. Add JSX UI block before {/* COMPRESS result metric */} comment
[ ] 7. Add EN translation to tool-translations.ts (after pdf-bookmarks EN entry)
[ ] 8. Add RU translation to tool-translations.ts (after pdf-bookmarks RU entry)
[ ] 9. Run: npx tsc --noEmit → must be 0 errors
[10] 10. Test in browser: http://localhost:5000/tools/<slug>
```

---

## 13. Known Patterns and Pitfalls

### pdfjs lazy loading
```typescript
// In pdf-utils.ts — always use this pattern:
const pdfjs = await loadPdfJs();
const doc = await pdfjs.getDocument({ data: bytes }).promise;
```

### pdf-lib embedPages vs copyPages
- `embedPages(pages[])` → returns `PDFEmbeddedPage[]` — use with `page.drawPage(ep, opts)` ✅
- `copyPages(src, [idx])` → returns `PDFPage[]` — use with `dst.addPage(page)` ✅
- **Never mix**: `drawPage()` requires `PDFEmbeddedPage`, not `PDFPage`

### File chooser in Playwright tests
- `compare-pdf` has a plain `<input type="file">` always visible → triggers Playwright file chooser modal on all pages
- This is a Playwright artifact only, not a real user bug

### text-line coordinate system
- `pdfjs-dist` viewport Y: top=0, bottom=height (screen coords)
- `pdf-lib` Y: bottom=0, top=height (PDF coords)  
- Convert: `pdfY = pageHeight - viewportY`

### Edit PDF canvas scale
- `DISPLAY_SCALE = 1.5` — pdfjs renders at 1.5× for sharpness
- Fabric canvas runs at CSS zoom × 1.5 base

---

## 14. Contact & Context

- Project: **PDFX** (pdfx.tools)
- Owner: Turpal
- Language rule: All UI text must have **Russian AND English** versions
- Design: premium dark/warm aesthetic, no plain colors, glassmorphism accents
- The `.codex-scratch/stirling-pdf/` directory contains a clone of Stirling-PDF used for reference

