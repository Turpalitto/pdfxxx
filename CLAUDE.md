# CLAUDE.md — PDFX Codebase Guide

## Overview

PDFX is a modern SaaS PDF toolkit platform with a freemium model. **All PDF processing happens client-side in the browser** — files never leave the user's device. The backend is minimal: it serves the static app and generates SEO artifacts (sitemap, robots.txt).

---

## Development Commands

```bash
npm run dev       # Start development server (Express + Vite HMR) on port 5000
npm run build     # Production build (Vite → dist/public, esbuild → dist/index.cjs)
npm run start     # Run production build
npm run check     # TypeScript type-check (tsc)
npm run db:push   # Push Drizzle schema to PostgreSQL
```

No linter, no formatter, no test suite is configured. `npm run check` is the main validation step.

---

## Project Structure

```
/
├── client/               # React SPA (all user-facing code)
│   ├── index.html        # Entry HTML (SEO meta, hreflang, schema.org JSON-LD)
│   └── src/
│       ├── App.tsx       # Root router + providers (Query, Theme, Lang)
│       ├── main.tsx      # ReactDOM.createRoot
│       ├── components/   # Reusable components
│       │   ├── navbar.tsx
│       │   ├── footer.tsx
│       │   ├── file-upload.tsx
│       │   ├── tool-card.tsx
│       │   ├── progress-ring.tsx
│       │   ├── animated-background.tsx
│       │   └── ui/       # Shadcn/ui primitives (50+ components, do not hand-edit)
│       ├── hooks/        # use-seo.ts, use-toast.ts, use-mobile.tsx
│       ├── lib/
│       │   ├── tools.ts             # Tool registry (29 tools, 7 categories, all metadata)
│       │   ├── pdf-utils.ts         # All PDF processing logic (pdf-lib, pdfjs-dist, tesseract)
│       │   ├── i18n.ts              # All UI strings in 20 languages
│       │   ├── tool-translations.ts # Tool names/descriptions in 20 languages
│       │   ├── lang-context.tsx     # Language provider + useLanguage hook
│       │   ├── theme.tsx            # Dark/light theme provider
│       │   ├── upload-limits.ts     # Per-tool file size limits (default 500MB)
│       │   ├── queryClient.ts       # @tanstack/react-query config
│       │   └── utils.ts             # Tailwind cn() helper
│       └── pages/
│           ├── home.tsx             # Landing page
│           ├── tool-page.tsx        # Generic tool page (file upload → process → download)
│           ├── edit-pdf-page.tsx    # Dedicated PDF editor (fabric.js canvas)
│           ├── pricing.tsx          # Pricing (UI only — Stripe not integrated)
│           └── not-found.tsx        # 404
├── server/
│   ├── index.ts          # Express app, middleware, logging
│   ├── routes.ts         # SEO routes: /sitemap.xml, /robots.txt
│   ├── static.ts         # Serve dist/public in production
│   ├── vite.ts           # Vite dev middleware integration
│   └── storage.ts        # In-memory user storage (MemStorage)
├── shared/
│   └── schema.ts         # Drizzle ORM schema (users table)
├── script/
│   └── build.ts          # esbuild bundler for server
├── replit.md             # High-level project overview (keep in sync)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── drizzle.config.ts
```

---

## Application Routes

| URL | Component | Notes |
|-----|-----------|-------|
| `/` | `home.tsx` | Hero, stats, tool grid with category filters |
| `/tools/edit-pdf` | `edit-pdf-page.tsx` | Dedicated fabric.js canvas editor |
| `/tools/:slug` | `tool-page.tsx` | Dynamic page for 28 other tool slugs |
| `/pricing` | `pricing.tsx` | Free/Pro/Team tiers, billing toggle |
| `/sitemap.xml` | Express route | 29 tools × 20 langs + static pages |
| `/robots.txt` | Express route | Disallows /api/, Crawl-delay: 1 |

---

## The 29 PDF Tools

Tools are registered in `client/src/lib/tools.ts` with this interface:
```ts
interface Tool {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  emoji: string;
  category: string;  // one of 7 category IDs below
  color: string;
  pro?: boolean;     // requires Pro tier
  beta?: boolean;
  maxFilesMb?: number;
  accept?: string;   // file input accept string
  multiple?: boolean;
  outputExt?: string;
}
```

**7 categories and their slugs:**

| Category ID | Tools |
|-------------|-------|
| `convert-from` | pdf-to-word, pdf-to-jpg, pdf-to-png, pdf-to-text, pdf-to-html, pdf-to-excel |
| `convert-to` | word-to-pdf, images-to-pdf, excel-to-pdf, text-to-pdf |
| `organize` | merge-pdf, split-pdf, rotate-pdf, delete-pages, reorder-pages, extract-pages |
| `security` | protect-pdf, unlock-pdf, sign-pdf, watermark-pdf, redact-pdf (Pro) |
| `optimize` | compress-pdf, repair-pdf, flatten-pdf |
| `ocr` | ocr-pdf, photo-to-pdf |
| `utility` | pdf-page-numbers, pdf-header-footer, edit-pdf |

**Adding a new tool:** Add an entry to the `tools` array in `tools.ts`, add translations in `tool-translations.ts` for all 20 languages, and implement the processing function in `pdf-utils.ts`.

---

## PDF Processing Architecture

All PDF operations run **in the browser** via:
- **pdf-lib** — primary manipulation (merge, split, rotate, compress, watermark, etc.)
- **pdfjs-dist** — rendering PDFs to canvas (edit-pdf-page, pdf-to-jpg/png)
- **tesseract.js** — OCR (ocr-pdf, photo-to-pdf)
- **fabric.js** — canvas editor (edit-pdf-page)
- **jszip** — ZIP packaging of multi-file outputs
- **mammoth** — Word doc parsing (word-to-pdf)

Processing functions live in `client/src/lib/pdf-utils.ts`. Each export corresponds to one or more tool operations. The generic `tool-page.tsx` calls these functions based on the tool slug.

---

## Internationalization (i18n)

**20 supported languages:** `en, ru, es, fr, de, it, pt, zh, ja, ko, ar, tr, hi, pl, nl, uk, vi, id, th, cs`

**Three i18n files:**
1. `client/src/lib/i18n.ts` — All UI strings (navbar, buttons, errors, form labels, placeholders)
2. `client/src/lib/tool-translations.ts` — Tool names and descriptions per language
3. `client/src/lib/tools.ts` — Category labels via `getCategoryLabel(id, lang)`

**Usage pattern:**
```tsx
import { useLanguage } from "@/lib/lang-context";
import { t } from "@/lib/i18n";
import { getToolTranslation } from "@/lib/tool-translations";

const { lang } = useLanguage();
const label = t("upload.button", lang);
const toolName = getToolTranslation(slug, lang).name;
```

**Rule:** Every user-visible string must be added to all 20 language entries in `i18n.ts`. Never hardcode English strings in components.

---

## Design System & Conventions

**Theme:** Dark mode by default. Toggle via `ThemeProvider` in `App.tsx`.

**Colors:**
- Primary accent: purple `#6c5ce7` (CSS var: `--primary`)
- Each tool category has a named color (blue, violet, green, orange, yellow, pink, cyan)
- Tool cards use gradient backgrounds derived from category color
- Glassmorphism: `bg-white/5 backdrop-blur border-white/10`

**Typography:** Inter font, loaded via `/public/fonts/`

**Component library:** Shadcn/ui (Radix UI primitives + Tailwind). Components live in `client/src/components/ui/`. **Do not manually edit these** — use Shadcn CLI or copy from shadcn docs.

**Animations:** Framer Motion throughout. Prefer `motion.div` with `initial/animate/exit` variants. Avoid adding raw CSS transitions where Framer Motion is already used.

**Responsive breakpoints:** Mobile 375px+, tablet 768px (`md:`), desktop 1280px (`xl:`).

**Icons:** Lucide React exclusively.

---

## TypeScript Configuration

```json
{
  "strict": true,
  "paths": {
    "@/*": ["./client/src/*"],
    "@shared/*": ["./shared/*"]
  }
}
```

Always use path aliases (`@/lib/tools`, `@shared/schema`). Never use relative paths crossing directory boundaries.

---

## Backend (Minimal)

The Express server (`server/index.ts`) does very little:
- Serves the Vite dev middleware (dev) or `dist/public` (prod)
- Exposes SEO routes: `/sitemap.xml`, `/robots.txt`
- No PDF processing — all client-side
- Auth scaffolding exists (Passport, express-session, connect-pg-simple) but is not wired to any UI

**Database:** PostgreSQL via Drizzle ORM. Currently only a `users` table. Schema in `shared/schema.ts`. Run `npm run db:push` after schema changes.

**Storage:** `server/storage.ts` has a `MemStorage` class for in-memory user storage (dev/fallback). Not used in production yet.

---

## SEO

- `index.html` has full hreflang links for all 20 languages and schema.org JSON-LD
- `server/routes.ts` generates dynamic sitemap (29 tools × 20 languages = 580 tool URLs + static pages)
- `use-seo.ts` hook sets `<title>` and `<meta>` per page/language
- Canonical URL: `https://pdfx.tools/`

When adding a new tool or page, update the sitemap generation in `server/routes.ts`.

---

## Monetization (UI Only)

Stripe is **not integrated**. The pricing UI (`pricing.tsx`) is display-only:
- **Free:** 3 ops/hour, 25MB limit
- **Pro:** ₽499/month or ₽374/month (annual) — unlimited, AI tools
- **Team:** ₽1490/month or ₽1118/month (annual)

The `pro: true` flag on tools in the registry is present but enforcement is not implemented.

---

## Key Patterns & Gotchas

1. **Client-side only PDF ops** — never attempt to move PDF processing to the server without significant architecture changes (memory, streaming, security).

2. **File size limit** — 500MB across all tools (`upload-limits.ts`). Changing this requires updating the UI copy in `pricing.tsx` and `i18n.ts` as well.

3. **The `edit-pdf-page` is a special route** (`/tools/edit-pdf`) handled separately from the generic `tool-page.tsx`. It uses fabric.js and has its own complex lifecycle.

4. **Language detection** — `lang-context.tsx` reads from URL path prefix or `localStorage`. URL takes priority.

5. **Tool slugs are URLs** — slugs in `tools.ts` must be URL-safe, lowercase, hyphenated, and unique. They appear in routes, sitemaps, and translation keys.

6. **No tests** — There is no test suite. Validate changes with `npm run check` (TypeScript) and manual browser testing.

7. **No linter/formatter** — There is no ESLint or Prettier. Follow existing code style: 2-space indentation, single quotes in TS, double quotes in JSX attributes.

8. **Shadcn/ui components** — The `components/ui/` directory is managed by Shadcn. Avoid hand-editing these files; add customization via Tailwind variants or wrapper components.
