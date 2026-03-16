# PDFX — Free PDF Tools

31 free PDF tools that run entirely in the browser. No file uploads, no watermarks, no signup.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **PDF processing**: pdf-lib, pdfjs-dist, WebAssembly
- **OCR**: Tesseract.js
- **Server**: Express (serves static files + sitemap/robots)
- **UI**: shadcn/ui + Framer Motion

## Development

```bash
# Install dependencies
npm install

# Start dev server (port 5000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

```env
PORT=5000
NODE_ENV=development
```

## Project Structure

```
client/
  src/
    pages/          # home, tool-page, edit-pdf-page, pricing, not-found
    components/     # navbar, footer, tool-card, file-upload, animated-background
    lib/            # tools.ts, pdf-utils.ts, tool-translations.ts, languages.ts
    hooks/          # use-seo.ts
server/
  index.ts          # Express server
  routes.ts         # sitemap.xml, robots.txt
shared/             # shared types
```

## Tool Categories

| Category | Tools |
|----------|-------|
| Convert from PDF | PDF→Word, PDF→JPG, PDF→PNG, PDF→Text, PDF→HTML, PDF→Excel (Pro) |
| Convert to PDF | Word→PDF, Images→PDF, Text→PDF, Excel→PDF (Pro) |
| Organize | Merge, Split, Rotate, Delete Pages, Extract Pages, Reorder |
| Security | Protect, Unlock, Redact |
| Optimize | Compress, Repair, Flatten |
| OCR & Scan | OCR PDF, Scan to PDF |
| Utility | Watermark, Page Numbers, Header/Footer, Sign PDF |

## License

MIT
