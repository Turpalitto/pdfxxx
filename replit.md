# PDFX — PDF Tools SaaS Platform

## Overview
PDFX is a modern SaaS PDF toolkit platform with a freemium model. All PDF processing happens client-side in the browser using pdf-lib — files never leave the user's device.

## Architecture

### Tech Stack
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, Framer Motion, Shadcn/ui components
- **Backend:** Express.js (minimal — serves the app, future API routes)
- **PDF Processing:** pdf-lib (client-side), pdfjs-dist, tesseract.js
- **Routing:** wouter
- **State/Data:** @tanstack/react-query

### Key Files
- `client/src/App.tsx` — Root app with routing and providers
- `client/src/lib/tools.ts` — Tool registry (29 tools, 7 categories)
- `client/src/lib/pdf-utils.ts` — PDF processing functions (pdf-lib)
- `client/src/lib/theme.tsx` — Dark/light theme provider (dark by default)
- `client/src/pages/home.tsx` — Landing page: hero + stats + feature chips + tool grid + AI demo section + CTA
- `client/src/pages/tool-page.tsx` — Dynamic tool page with file upload and processing
- `client/src/pages/pricing.tsx` — Pricing page with Free/Pro/Team (₽ prices), billing toggle, comparison table, FAQ accordion, guarantee
- `client/src/components/navbar.tsx` — Top navigation with tools dropdown
- `client/src/components/footer.tsx` — Footer with links
- `client/src/components/tool-card.tsx` — Tool card component
- `client/src/components/file-upload.tsx` — Drag-and-drop file upload
- `client/src/components/progress-ring.tsx` — Circular progress indicator

### Routes
- `/` — Homepage with hero, tool grid, category filters, FAQ, social proof
- `/tools/edit-pdf` — Dedicated PDF annotation editor (fabric.js + pdfjs-dist + pdf-lib)
- `/tools/:slug` — Individual tool page (28 tool slugs)
- `/pricing` — Pricing page with Free vs Pro comparison

## Tools (29 total)

### Convert from PDF
- pdf-to-word, pdf-to-jpg, pdf-to-png, pdf-to-text, pdf-to-html, pdf-to-excel

### Convert to PDF
- word-to-pdf, images-to-pdf, excel-to-pdf, text-to-pdf

### Organize PDF
- merge-pdf, split-pdf, rotate-pdf, delete-pages, reorder-pages, extract-pages

### PDF Security
- protect-pdf, unlock-pdf, sign-pdf, watermark-pdf, redact-pdf (Pro)

### Optimize & Repair
- compress-pdf, repair-pdf, flatten-pdf

### OCR & Scan
- ocr-pdf, photo-to-pdf

### Utility
- pdf-page-numbers, pdf-header-footer, edit-pdf (dedicated page with fabric.js editor)

## Functional Processing (pdf-lib)
- Merge PDF — combines multiple PDFs
- Split PDF — by page range
- Rotate PDF — 90/180/270 degrees
- Delete Pages — by page number list
- Extract Pages — by page number list
- Reorder Pages — by new order
- Compress PDF — low/medium/high levels
- Watermark PDF — text with opacity control
- Add Page Numbers — 4 positions
- Images to PDF — multiple images
- Text to PDF — from file or pasted text
- Header/Footer — custom text

## Design
- Dark mode default, Inter font, purple accent (#6c5ce7)
- Tool cards: emoji icons (56×56 gradient boxes) with hover glow + border glow based on category color
- Category filter pills: fully translated via `getCategoryLabel(id, lang)` in tools.ts
- Glassmorphism cards, gradient hero with animated orbs, smooth Framer Motion animations
- Fully responsive (mobile 375px+, tablet 768px+, desktop 1280px+)
- Shadcn/ui component system throughout

## i18n
- 20 languages; all UI strings in `i18n.ts` including all tool-page form labels/errors
- Category labels: `getCategoryLabel(id, lang)` in `tools.ts` has all 20 languages
- Tool names/descriptions: `getToolTranslation(slug, lang)` in `tool-translations.ts`
- All form labels, error messages, placeholders, dropdown options fully localized

## Monetization (UI Only — Stripe not yet integrated)
- Free tier: 3 ops/hour, 25MB limit
- Pro tier: ₽499/month or ₽374/month (annual), unlimited, AI tools
- Team tier: ₽1490/month or ₽1118/month (annual)
