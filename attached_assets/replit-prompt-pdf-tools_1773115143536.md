# ПРОМПТ ДЛЯ REPLIT — PDF TOOLS SaaS ПЛАТФОРМА

---

## ВСТАВЬ ЭТОТ ПРОМПТ В REPLIT AGENT:

---

Build a full-stack production-ready web application called **"PDFX"** — an advanced PDF toolkit platform. The app must be a modern SaaS with freemium model, ad-supported free tier, and premium subscriptions. The goal is passive income via ads + subscriptions.

---

## 🏗️ TECH STACK (strictly follow)

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Framer Motion for animations
- **Backend:** Next.js API Routes + serverless functions
- **PDF processing:** pdf-lib, pdf.js (Mozilla), Tesseract.js (OCR), sharp (image processing), mammoth (DOCX), xlsx (Excel)
- **Database:** Supabase (PostgreSQL) — for user accounts, usage tracking, file history
- **Auth:** Supabase Auth (Google, GitHub, email/password sign-in)
- **Payments:** Stripe Checkout + Stripe Webhooks for Pro subscriptions
- **Ads:** Google AdSense integration (banner + interstitial slots)
- **File storage:** Temporary server-side storage with auto-cleanup after 1 hour (free tier) / 24 hours (Pro)
- **Deployment:** Optimized for Replit with autoscale

---

## 🎨 DESIGN & UX REQUIREMENTS (THIS IS CRITICAL — must look premium)

### Visual Identity
- **Color palette:** Deep navy (#0F172A) as primary dark, electric blue (#3B82F6) as accent, soft white (#F8FAFC) backgrounds, subtle gradients (blue-to-purple for CTAs)
- **Typography:** Inter font family. Headings bold 600-800, body 400. Clean hierarchy.
- **Style:** Glassmorphism cards with subtle backdrop-blur, soft shadows, rounded-xl corners (12-16px). NO generic Bootstrap look. Think: Linear.app meets Vercel dashboard aesthetics.
- **Dark mode:** Full dark/light theme toggle. Dark mode is DEFAULT.
- **Micro-animations:** Every tool card has hover lift + glow effect. File upload has drag-and-drop with animated dashed border pulse. Processing shows a smooth progress ring (not a boring bar). Completed actions show confetti micro-burst or checkmark animation.

### Layout & Navigation
- **Landing page (/):** Hero section with animated PDF icon morphing into different formats. Value proposition: "All PDF Tools. Free. No Upload Limits on Size. No Watermarks." Below: grid of tool cards (icons + labels) grouped by category. Social proof section (fake but realistic counters: "2M+ files processed", "180+ countries"). FAQ accordion. Footer with SEO links.
- **Tool pages (/tools/[tool-slug]):** Clean single-purpose layout. Left: upload zone + options. Right: preview pane showing PDF thumbnail. Below: action button + result download. Related tools sidebar.
- **Dashboard (/dashboard):** For logged-in users — file history, usage stats, saved presets, account settings.
- **Pricing page (/pricing):** Comparison table Free vs Pro with toggle monthly/yearly.

### Mobile-First Responsive
- Every page must work flawlessly on mobile (375px+), tablet (768px+), desktop (1280px+)
- Bottom navigation bar on mobile with quick-access to top 4 tools
- Touch-friendly upload areas (large tap targets)

### Performance
- Lighthouse score target: 90+ on all metrics
- Lazy-load tool pages. Code-split each tool into its own chunk.
- Skeleton loaders for every async operation
- All PDF processing happens CLIENT-SIDE in the browser (using Web Workers) for free tier — this saves server costs and is faster for users

---

## 📋 COMPLETE TOOL LIST (implement ALL of these)

### Category 1: Convert FROM PDF
1. **PDF to Word** (.pdf → .docx) — preserve formatting
2. **PDF to Excel** (.pdf → .xlsx) — detect tables automatically
3. **PDF to PowerPoint** (.pdf → .pptx) — each page becomes a slide
4. **PDF to JPG/PNG** (.pdf → images) — choose DPI: 72/150/300
5. **PDF to Text** (.pdf → .txt) — clean text extraction
6. **PDF to HTML** (.pdf → .html)

### Category 2: Convert TO PDF
7. **Word to PDF** (.docx → .pdf)
8. **Excel to PDF** (.xlsx → .pdf)
9. **JPG/PNG to PDF** (images → .pdf) — multiple images, arrange order via drag-and-drop
10. **HTML to PDF** (URL or paste HTML → .pdf)
11. **Text to PDF** (paste or upload .txt → styled .pdf)
12. **PowerPoint to PDF** (.pptx → .pdf)

### Category 3: Organize PDF
13. **Merge PDF** — combine multiple PDFs, drag to reorder, preview thumbnails
14. **Split PDF** — by page ranges, every N pages, or extract specific pages
15. **Rotate PDF** — rotate individual pages or all, 90/180/270 degrees
16. **Delete Pages** — visual page selector with thumbnails, click to remove
17. **Reorder Pages** — drag-and-drop page thumbnails to rearrange
18. **Extract Pages** — select specific pages to extract into new PDF

### Category 4: PDF Security
19. **Protect PDF** — add password encryption (AES-256)
20. **Unlock PDF** — remove password (user must know the password)
21. **Sign PDF** — draw signature on canvas or upload image, place on page
22. **Watermark PDF** — text or image watermark, opacity/position/rotation controls
23. **Redact PDF** — black out sensitive text areas (PRO ONLY)

### Category 5: Optimize & Repair
24. **Compress PDF** — 3 levels: low/medium/maximum compression, show size reduction %
25. **Repair PDF** — attempt to fix corrupted PDFs
26. **Flatten PDF** — flatten form fields and annotations

### Category 6: OCR & Scan Tools (KEY DIFFERENTIATOR)
27. **OCR — Scanned PDF to Searchable PDF** — Tesseract.js, support English + Russian + Spanish + French + German + Chinese + Arabic. Show detected text overlay. This is the killer feature.
28. **Photo to PDF (Camera Scan)** — mobile camera capture → auto-crop → perspective correction → enhance contrast → save as clean PDF. Like CamScanner but in browser.
29. **Handwriting to Text** — OCR optimized for handwritten notes (experimental, label as beta)
30. **Batch OCR** — process multiple scanned PDFs at once (PRO ONLY)

### Category 7: AI-Powered Tools (PRO FEATURES — competitive edge)
31. **AI PDF Summary** — upload PDF, get AI-generated summary (use free LLM API or OpenAI)
32. **AI PDF Chat** — ask questions about your PDF content (PRO ONLY)
33. **AI PDF Translate** — translate entire PDF to another language preserving layout (PRO ONLY)
34. **AI Form Filler** — auto-detect form fields and suggest values (PRO ONLY)

### Category 8: Utility
35. **PDF Page Numbers** — add page numbers with position/format options
36. **PDF Header/Footer** — add custom headers/footers
37. **Compare PDFs** — side-by-side visual diff of two PDFs (PRO ONLY)
38. **PDF Metadata Editor** — edit title, author, keywords, creation date

---

## 💰 MONETIZATION MODEL (critical for $100+/month goal)

### Free Tier (ad-supported)
- Access to ALL basic tools (categories 1-6, tools #1-28)
- Limitations:
  - Max 3 file operations per hour (resets every 60 min)
  - Max file size: 25 MB per file
  - Max 20 pages per PDF for OCR
  - Batch processing: max 3 files at once
  - Standard compression only
  - Files auto-deleted after 1 hour
  - Watermark on output: tiny "Made with PDFX.tools" in metadata only (NOT visible on pages — this builds trust)
  - NO AI features
- Ads shown:
  - Banner ad (728x90) at top of tool page (below nav, above upload area)
  - Rectangle ad (300x250) in sidebar on desktop
  - Interstitial ad shown ONCE after every 3rd file processed (skippable after 5 seconds)
  - Native ad card in the "Related Tools" section
  - Banner ad in footer
  - **IMPORTANT:** Ads must NOT cover the upload area or download buttons. Ads must not pop up during processing. User experience comes first — annoying ads = users leave.

### Pro Tier — $4.99/month or $39.99/year (save 33%)
- UNLIMITED file operations (no hourly limit)
- Max file size: 500 MB
- Unlimited pages for OCR
- Batch processing: up to 50 files
- All compression levels
- Files stored for 24 hours
- NO ads anywhere
- Access to ALL AI tools (#31-34)
- Access to PRO-only tools (#23, #30, #33, #34, #37)
- Priority processing (dedicated worker)
- Email support
- File history dashboard (last 30 days)

### Revenue Projections Setup
- Implement analytics tracking: page views, tool usage, conversion funnel
- Add Plausible Analytics or Google Analytics 4
- Track: visits → tool_used → file_processed → pro_signup events

---

## 🔧 TECHNICAL IMPLEMENTATION DETAILS

### File Processing Architecture
```
User uploads file
  → Client-side validation (type, size)
  → For FREE tier: process in browser using Web Workers (pdf-lib, Tesseract.js)
  → For PRO tier: can optionally use server-side processing for heavy tasks
  → Generate output file
  → Show download button
  → Auto-delete temp file after timeout
```

### Key Technical Decisions
1. **Client-side processing by default** — This is the #1 competitive advantage. Competitors upload files to their servers (slow, privacy concerns). PDFX processes locally in the browser. Market this: "Your files never leave your device" — huge selling point.
2. **Web Workers** — All CPU-heavy operations (OCR, conversion, compression) run in Web Workers to keep UI responsive. Show real-time progress updates from worker.
3. **Streaming for large files** — Use ReadableStream API for files over 10MB to avoid memory issues.
4. **Service Worker caching** — Cache the app shell and processing libraries for offline capability. The tool should work even without internet for basic operations (offline-first PWA).

### Database Schema (Supabase)
```sql
-- Users table (managed by Supabase Auth, extend with):
profiles:
  id (uuid, FK to auth.users)
  plan (enum: 'free', 'pro')
  stripe_customer_id (text, nullable)
  operations_today (int, default 0)
  operations_reset_at (timestamp)
  created_at (timestamp)

-- Usage tracking for analytics
usage_logs:
  id (uuid)
  user_id (uuid, nullable — anonymous users tracked too)
  tool_slug (text) -- e.g., 'merge-pdf', 'ocr'
  file_size_bytes (bigint)
  processing_time_ms (int)
  status (enum: 'success', 'error')
  is_pro (boolean)
  created_at (timestamp)

-- For file history (pro users)
file_history:
  id (uuid)
  user_id (uuid)
  tool_slug (text)
  original_filename (text)
  output_filename (text)
  output_url (text) -- temporary signed URL
  expires_at (timestamp)
  created_at (timestamp)
```

### API Routes
```
POST /api/process/[tool] — server-side processing fallback
POST /api/auth/callback — Supabase auth callback
POST /api/stripe/webhook — Stripe payment webhook
POST /api/stripe/checkout — create Stripe checkout session
GET  /api/usage — get current user's usage stats
POST /api/ai/summary — AI summary endpoint (PRO)
POST /api/ai/chat — AI chat endpoint (PRO)
```

---

## 🌍 SEO & GROWTH (critical for organic traffic = ad revenue)

### SEO Structure
- Every tool gets its own page: `/tools/merge-pdf`, `/tools/compress-pdf`, `/tools/ocr-pdf`, etc.
- Each tool page has:
  - H1: "[Action] PDF Online — Free [Tool Name]" (e.g., "Merge PDF Online — Free PDF Combiner")
  - Meta description optimized for search
  - Schema.org SoftwareApplication markup
  - FAQ section with 5 common questions (using `<details>` for accordion)
  - "How to [action] a PDF" step-by-step guide (3-4 steps with screenshots placeholder)
  - Related tools links (internal linking for SEO juice)
- Generate a sitemap.xml dynamically
- Add robots.txt
- OpenGraph + Twitter Card meta tags for social sharing
- Canonical URLs on all pages

### Content Pages (for SEO traffic)
- `/blog` — auto-generated blog-style pages:
  - "How to Merge PDF Files — Complete Guide 2025"
  - "Best Free OCR Tools Online"
  - "How to Compress PDF Without Losing Quality"
  - "PDF Security: How to Password Protect Your Documents"
  - Create at least 10 SEO-optimized content pages

### Performance SEO
- Core Web Vitals optimization
- Image optimization with next/image
- Prefetch links on hover
- Static generation for all tool landing pages (ISR)

---

## 🛡️ SECURITY & PRIVACY

- All file processing client-side (files never uploaded to server for free tier)
- No file logging or storage for anonymous users
- HTTPS everywhere
- CSP headers configured
- Rate limiting on API routes (express-rate-limit)
- Input sanitization for all user inputs
- Display prominent privacy badge: "🔒 Your files are processed locally and never stored on our servers"
- Cookie consent banner (GDPR compliance)
- Privacy Policy page (/privacy)
- Terms of Service page (/terms)

---

## 📱 PWA (Progressive Web App)

- Add manifest.json with app name, icons, theme colors
- Service worker for offline caching of app shell
- "Add to Home Screen" prompt on mobile after 2nd visit
- Splash screen with PDFX logo
- This makes it feel like a native app — competitive advantage over web-only competitors

---

## 🚀 LAUNCH CHECKLIST (implement all)

1. [ ] Landing page with all tools grid
2. [ ] At least implement these 15 core tools first: Merge, Split, Compress, Rotate, PDF-to-JPG, JPG-to-PDF, PDF-to-Word, Word-to-PDF, OCR, Delete Pages, Reorder Pages, Protect, Unlock, Watermark, Page Numbers
3. [ ] Auth system (sign up / log in)
4. [ ] Free tier with usage limits + ads
5. [ ] Stripe integration for Pro
6. [ ] Pricing page
7. [ ] Mobile responsive
8. [ ] Dark/light mode
9. [ ] SEO meta tags on all pages
10. [ ] Privacy policy + Terms
11. [ ] Analytics setup
12. [ ] PWA manifest + service worker
13. [ ] Error handling + toast notifications
14. [ ] 404 page with tool suggestions
15. [ ] Loading states + progress indicators for all operations

---

## 🎯 CRITICAL SUCCESS DIFFERENTIATORS (what makes PDFX beat competitors)

1. **Client-side processing** — ILovePDF, SmallPDF etc. upload your files. We don't. Privacy wins.
2. **No visible watermarks on free tier** — competitors add watermarks. We don't. Users love us.
3. **OCR in browser** — most competitors need server for OCR. We do it client-side with Tesseract.js.
4. **Camera scan in browser** — CamScanner functionality without installing an app.
5. **Dark mode by default** — no competitor has proper dark mode.
6. **Speed** — no upload/download wait for server. Instant local processing.
7. **PWA** — works offline, installable. No competitor offers this.
8. **AI features** — summary, chat with PDF, translate. Future-proof.
9. **Beautiful UI** — glassmorphism, animations, micro-interactions. Not the typical boring tool site.
10. **Generous free tier** — 25MB file size is more than most free tiers offer.

---

## FINAL IMPORTANT NOTES

- Start by building the core infrastructure: layout, navigation, auth, one working tool (Merge PDF). Then expand tool by tool.
- Use reusable components: `<FileUploader>`, `<PDFPreview>`, `<ProcessingProgress>`, `<DownloadButton>`, `<AdSlot>`, `<ToolCard>`, `<UsageLimitBanner>`
- Every tool follows the same UX pattern: Upload → Configure → Process → Download. Consistency is key.
- Error messages must be friendly and helpful, never technical. "Oops! This file seems damaged. Try re-saving it and uploading again." not "Error: Invalid PDF header"
- Test with edge cases: 0-byte files, password-protected PDFs, scanned-only PDFs, 500-page documents, corrupted files.
- The site MUST work without JavaScript disabled (show graceful fallback message).
- Add a "Report Bug" floating button (bottom-right) that opens a simple feedback form.

Build this as a production-quality application, not a prototype. Every detail matters.
