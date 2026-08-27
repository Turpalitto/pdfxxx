import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
  rgb,
  StandardFonts,
  degrees,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// ============================================================
// Canvas abstraction (ADR-010)
// ============================================================
// One code path for main thread and Web Worker: in a worker there is no
// `document`, so we use OffscreenCanvas when it is available. All rasterising
// tools (grayscale, invert, scanner, redact, pdfToImages, OCR…) go through
// these helpers so the same function body is safe to call from pdf-worker.ts.

interface RenderCanvas {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

export function createRenderCanvas(width: number, height: number): RenderCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
    );
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
    if (!ctx) throw new Error('Could not create 2d context.');
    return { canvas, ctx };
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2d context.');
  return { canvas, ctx };
}

async function canvasToBytes(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.92,
): Promise<Uint8Array> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: format, quality });
    return new Uint8Array(await blob.arrayBuffer());
  }
  const dataUrl = (canvas as HTMLCanvasElement).toDataURL(format, quality);
  return dataUrlToBytes(dataUrl);
}

let _pdfjsModule: any = null;
export async function loadPdfJs(): Promise<any> {
  if (!_pdfjsModule) {
    const pdfjs = await import('pdfjs-dist');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url,
      ).href;
    }
    _pdfjsModule = pdfjs;
  }
  return _pdfjsModule;
}

/** Загружает PDF через pdfjs с таймаутом — защита от битых/гигантских файлов. */
async function openPdfWithPdfjs(file: File | Uint8Array, timeoutMs = 30_000): Promise<any> {
  const pdfjs = await loadPdfJs();
  const bytes = file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  return withTimeout(
    loadingTask.promise,
    timeoutMs,
    'PDF loading timed out. The file may be corrupted or too complex.',
  );
}

function pixelLoop(
  imageData: ImageData,
  transform: (r: number, g: number, b: number) => [number, number, number],
) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = transform(data[i], data[i + 1], data[i + 2]);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

let _unicodeFontBytes: ArrayBuffer | null = null;

async function loadUnicodeFont(): Promise<ArrayBuffer> {
  if (!_unicodeFontBytes) {
    const resp = await fetch('/fonts/NotoSans-Regular.ttf');
    if (!resp.ok) throw new Error('Could not load Unicode font.');
    _unicodeFontBytes = await resp.arrayBuffer();
  }
  return _unicodeFontBytes;
}

async function embedUnicodeFont(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);
  const bytes = await loadUnicodeFont();
  return pdfDoc.embedFont(bytes);
}

function needsUnicode(text: string) {
  // eslint-disable-next-line no-control-regex -- intentional non-ASCII byte check
  return /[^\x00-\x7F]/.test(text);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image.'));
    img.src = src;
  });
}

async function rasterizeImageToPngBytes(file: File): Promise<Uint8Array> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      throw new Error('Image has invalid dimensions.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create image canvas.');
    ctx.drawImage(img, 0, 0, width, height);
    return dataUrlToBytes(canvas.toDataURL('image/png'));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return mergedPdf.save();
}

export async function splitPdf(
  file: File,
  ranges: { start: number; end: number }[],
): Promise<Uint8Array[]> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const results: Uint8Array[] = [];
  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const pageIndices = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start - 1 + i,
    ).filter((i) => i >= 0 && i < pdf.getPageCount());
    const copiedPages = await newPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    results.push(await newPdf.save());
  }
  return results;
}

export async function rotatePdf(
  file: File,
  rotation: 90 | 180 | 270,
  pageIndices?: number[],
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const indices = pageIndices ?? pdf.getPageIndices();
  indices.forEach((i) => {
    const page = pdf.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + rotation) % 360));
  });
  return pdf.save();
}

export async function deletePages(file: File, pagesToDelete: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const keepIndices = src.getPageIndices().filter((i) => !pagesToDelete.includes(i));
  const copiedPages = await newPdf.copyPages(src, keepIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
}

export async function extractPages(file: File, pageIndices: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(src, pageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
}

export async function reorderPages(file: File, newOrder: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(src, newOrder);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
}

export type WatermarkPosition =
  'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export async function addWatermark(
  file: File,
  text: string,
  opacity: number = 0.3,
  rotation: number = 45,
  position: WatermarkPosition = 'center',
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = needsUnicode(text)
    ? await embedUnicodeFont(pdf)
    : await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) / 10;
    const drawAt = (x: number, y: number) =>
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: degrees(rotation),
      });

    if (position === 'tile') {
      const stepX = Math.max(fontSize * 6, width / 3);
      const stepY = Math.max(fontSize * 4, height / 4);
      for (let y = fontSize; y < height + stepY; y += stepY) {
        for (let x = -fontSize * 2; x < width + stepX; x += stepX) {
          page.drawText(text, {
            x,
            y,
            size: Math.max(10, fontSize / 2),
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity,
            rotate: degrees(rotation),
          });
        }
      }
      return;
    }

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const margin = fontSize;
    let x = width / 2 - textWidth / 2;
    let y = height / 2;
    if (position === 'top-left') {
      x = margin;
      y = height - margin;
    } else if (position === 'top-right') {
      x = width - textWidth - margin;
      y = height - margin;
    } else if (position === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (position === 'bottom-right') {
      x = width - textWidth - margin;
      y = margin;
    }
    drawAt(x, y);
  });
  return pdf.save();
}

export async function addPageNumbers(
  file: File,
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' = 'bottom-center',
  startFrom: number = 1,
  format: 'number' | 'x-of-y' = 'number',
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const text =
      format === 'x-of-y'
        ? `${i + startFrom} / ${pages.length + startFrom - 1}`
        : `${i + startFrom}`;
    const fontSize = 10;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x: number, y: number;
    switch (position) {
      case 'bottom-center':
        x = width / 2 - textWidth / 2;
        y = 20;
        break;
      case 'bottom-right':
        x = width - textWidth - 20;
        y = 20;
        break;
      case 'bottom-left':
        x = 20;
        y = 20;
        break;
      case 'top-center':
        x = width / 2 - textWidth / 2;
        y = height - 30;
        break;
    }
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
  });
  return pdf.save();
}

export async function compressPdf(
  file: File,
  level: 'low' | 'medium' | 'high' = 'medium',
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const firstPass = await pdf.save({ useObjectStreams: level !== 'low' });

  if (level === 'high') {
    const secondPdf = await PDFDocument.load(firstPass, { ignoreEncryption: true });
    const secondPass = await secondPdf.save({ useObjectStreams: true });
    const best = secondPass.byteLength < firstPass.byteLength ? secondPass : firstPass;
    if (best.byteLength >= bytes.byteLength) return new Uint8Array(bytes);
    return best;
  }

  if (firstPass.byteLength >= bytes.byteLength) return new Uint8Array(bytes);
  return firstPass;
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    let image;
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      image = await pdf.embedJpg(bytes);
    } else if (file.type === 'image/png') {
      image = await pdf.embedPng(bytes);
    } else {
      // WEBP and other browser-supported formats are rasterised to PNG.
      const pngBytes = await rasterizeImageToPngBytes(file);
      image = await pdf.embedPng(pngBytes);
    }
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return pdf.save();
}

export async function textToPdf(text: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = needsUnicode(text)
    ? await embedUnicodeFont(pdf)
    : await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const margin = 50;
  const lineHeight = fontSize * 1.4;
  const pageWidth = 595;
  const pageHeight = 842;
  const maxWidth = pageWidth - margin * 2;

  const rawLines = text.split('\n');
  const wrappedLines: string[] = [];
  for (const rawLine of rawLines) {
    if (rawLine.trim() === '') {
      wrappedLines.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const w = font.widthOfTextAtSize(test, fontSize);
      if (w > maxWidth && current) {
        wrappedLines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) wrappedLines.push(current);
  }

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  for (const line of wrappedLines) {
    if (y < margin + lineHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
    }
    y -= lineHeight;
  }
  return pdf.save();
}

export async function addHeaderFooter(
  file: File,
  header: string,
  footer: string,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const hasNonAscii = needsUnicode(header) || needsUnicode(footer);
  const font = hasNonAscii
    ? await embedUnicodeFont(pdf)
    : await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  pages.forEach((page) => {
    const { height } = page.getSize();
    if (header) {
      page.drawText(header, {
        x: 20,
        y: height - 20,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    if (footer) {
      page.drawText(footer, {
        x: 20,
        y: 10,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  });
  return pdf.save();
}

export async function repairPdf(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return pdf.save();
  } catch {
    throw new Error('The file is too damaged to repair. Please try another file.');
  }
}

export async function flattenPdf(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(src, src.getPageIndices());
  copiedPages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
}

export async function protectPdf(_file: File, _password: string): Promise<Uint8Array> {
  throw new Error(
    'PDF password encryption is not supported in the browser version. ' +
      'Please use Adobe Acrobat, LibreOffice, or a desktop PDF tool to add password protection. ' +
      'This feature is planned for the PDFX Pro server-side release.',
  );
}

export async function unlockPdf(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(src, src.getPageIndices());
  copiedPages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
}

export async function signPdf(
  file: File,
  signatureText: string,
  color: [number, number, number] = [0.1, 0.2, 0.8],
): Promise<Uint8Array> {
  if (!signatureText.trim()) throw new Error('Please enter your signature text.');
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = needsUnicode(signatureText)
    ? await embedUnicodeFont(pdf)
    : await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  const pages = pdf.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();
  const fontSize = 24;
  const textWidth = font.widthOfTextAtSize(signatureText, fontSize);
  lastPage.drawLine({
    start: { x: width - textWidth - 60, y: 60 },
    end: { x: width - 40, y: 60 },
    thickness: 1,
    color: rgb(...color),
  });
  lastPage.drawText(signatureText, {
    x: width - textWidth - 60,
    y: 65,
    size: fontSize,
    font,
    color: rgb(...color),
  });
  return pdf.save();
}

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

function normalizeSearchValue(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

type TextMatcher = (raw: string, normalized: string) => boolean;

function collectMatchingIndexes(textItems: any[], matcher: TextMatcher): Set<number> {
  const matches = new Set<number>();

  for (let i = 0; i < textItems.length; i++) {
    const raw = typeof textItems[i]?.str === 'string' ? textItems[i].str : '';
    if (!raw) continue;
    if (matcher(raw, normalizeSearchValue(raw))) {
      matches.add(i);
      continue;
    }
  }
  if (matches.size > 0) return matches;

  // Cross-item match: concatenate normalized chars keeping an index map so a
  // phrase split across separate text items ("FOO" + "BAR") is still found.
  const streamChars: string[] = [];
  const streamToItemIndex: number[] = [];
  let prevWasSpace = true;

  for (let i = 0; i < textItems.length; i++) {
    const raw = typeof textItems[i]?.str === 'string' ? textItems[i].str : '';
    const normalized = raw.normalize('NFKC').toLowerCase();
    for (const ch of normalized) {
      const isSpace = /\s/.test(ch);
      if (isSpace) {
        if (!prevWasSpace) {
          streamChars.push(' ');
          streamToItemIndex.push(i);
          prevWasSpace = true;
        }
      } else {
        streamChars.push(ch);
        streamToItemIndex.push(i);
        prevWasSpace = false;
      }
    }
  }

  const stream = streamChars.join('');

  // Try windows starting at every position (bounded) so phrases split across
  // separate text items are still matched by the predicate.
  for (let start = 0; start < stream.length; start++) {
    if (stream[start] === ' ') continue;
    for (let end = start + 1; end <= Math.min(stream.length, start + 256); end++) {
      const candidate = stream.slice(start, end).replace(/ $/, '');
      if (!candidate) continue;
      if (matcher(candidate, candidate)) {
        for (let idx = start; idx < end && idx < streamToItemIndex.length; idx++) {
          matches.add(streamToItemIndex[idx]);
        }
        break;
      }
    }
  }

  return matches;
}

/** Копирует страницу как есть в результирующий документ. */
async function copyPageInto(
  resultPdf: PDFDocument,
  pdfLib: PDFDocument,
  pageIndex: number,
): Promise<void> {
  const [copied] = await resultPdf.copyPages(pdfLib, [pageIndex]);
  resultPdf.addPage(copied);
}

export async function redactPdf(
  file: File,
  searchText: string,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  if (!searchText.trim()) {
    throw new Error('Please enter the text you want to redact.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const normalizedSearch = normalizeSearchValue(searchText);
  const matcher: TextMatcher = (_raw, normalized) => normalized.includes(normalizedSearch);

  return redactPagesWithMatcher(file, bytes, matcher, onProgress);
}

export async function redactPagesWithMatcher(
  _fileForSize: File | null,
  originalBytes: Uint8Array,
  matcher: TextMatcher,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const pdfjsBytes = originalBytes.slice(0);
  const pdfLibBytes = originalBytes.slice(0);

  const pdfjsDoc = await openPdfWithPdfjs(pdfjsBytes);
  onProgress?.(10);

  const pdfLib = await PDFDocument.load(pdfLibBytes, { ignoreEncryption: true });
  const resultPdf = await PDFDocument.create();
  const RENDER_SCALE = 1.5;

  onProgress?.(20);

  for (let pageIndex = 0; pageIndex < pdfjsDoc.numPages; pageIndex++) {
    onProgress?.(20 + Math.round((pageIndex / pdfjsDoc.numPages) * 70));
    const page = await pdfjsDoc.getPage(pageIndex + 1);

    let textItems: any[] = [];
    try {
      const tc = (await withTimeout(page.getTextContent(), 10_000, '')) as { items?: any[] };
      textItems = tc.items ?? [];
    } catch {
      // Text extraction failed on this page — copy as-is rather than destroy.
      await copyPageInto(resultPdf, pdfLib, pageIndex);
      continue;
    }

    const matchingItemIndexes = collectMatchingIndexes(textItems, matcher);

    if (matchingItemIndexes.size === 0) {
      await copyPageInto(resultPdf, pdfLib, pageIndex);
      continue;
    }

    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const { canvas, ctx } = createRenderCanvas(viewport.width, viewport.height);

    try {
      await withTimeout(
        page.render({
          canvasContext: ctx as CanvasRenderingContext2D,
          viewport,
          canvas,
        }).promise,
        20_000,
        `Page ${pageIndex + 1} could not be rendered for redaction`,
      );
    } catch {
      // Fail closed: abort instead of producing a document where the
      // sensitive text is still extractable.
      throw new Error(
        `Page ${pageIndex + 1} could not be rendered, so redaction was aborted. No file was changed.`,
      );
    }

    ctx.fillStyle = '#000000';
    matchingItemIndexes.forEach((itemIndex) => {
      const it = textItems[itemIndex] as any;
      if (!it.transform) return;
      const [, , , , tx, ty] = it.transform;
      const pt = viewport.convertToViewportPoint(tx, ty);
      const itemHeight = Math.max(8, Math.abs((it.height || it.transform[3] || 0) * RENDER_SCALE));
      const itemWidth = Math.max(8, (it.width || 0) * RENDER_SCALE);
      ctx.fillRect(
        Math.floor(pt[0]) - 2,
        Math.floor(pt[1]) - itemHeight - 2,
        Math.ceil(itemWidth) + 6,
        Math.ceil(itemHeight) + 6,
      );
    });

    const jpgBytes = await canvasToBytes(canvas, 'image/jpeg', 0.9);
    const img = await resultPdf.embedJpg(jpgBytes);
    const origPage = pdfLib.getPage(pageIndex);
    const { width, height } = origPage.getSize();
    const newPage = resultPdf.addPage([width, height]);
    newPage.drawImage(img, { x: 0, y: 0, width, height });
  }

  onProgress?.(98);
  return resultPdf.save();
}

export async function wordToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  let text = '';
  try {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } catch {
    throw new Error("Failed to read the Word document. Please make sure it's a valid .docx file.");
  }
  if (!text.trim()) {
    throw new Error(
      'The document appears to be empty or contains only images. Text conversion requires document text.',
    );
  }
  return textToPdf(text);
}

export async function pdfToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await openPdfWithPdfjs(new Uint8Array(arrayBuffer));
  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').join(' ');
    textParts.push(`--- Page ${i} ---\n${pageText}`);
  }
  return textParts.join('\n\n');
}

function dataUrlFromBytes(bytes: Uint8Array, mime: string): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function pdfToImages(
  file: File,
  format: 'jpg' | 'png' = 'jpg',
  scale: number = 2,
): Promise<{ dataUrl: string; page: number }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsDoc = await openPdfWithPdfjs(new Uint8Array(arrayBuffer));
  const results: { dataUrl: string; page: number }[] = [];
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  for (let i = 1; i <= pdfjsDoc.numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const { canvas, ctx } = createRenderCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport, canvas }).promise;
    const bytes = await canvasToBytes(canvas, mime, 0.92);
    results.push({ dataUrl: dataUrlFromBytes(bytes, mime), page: i });
  }
  return results;
}

export async function pdfToHtml(file: File): Promise<string> {
  const text = await pdfToText(file);
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${file.name.replace(/\.[^.]+$/, '')}</title>
<style>
  body { font-family: Georgia, serif; max-width: 860px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #222; }
  p { margin: 0 0 1em; }
</style>
</head>
<body>
${paragraphs}
</body>
</html>`;
}

export async function pdfImagesAsZip(
  images: { dataUrl: string; page: number }[],
  format: 'jpg' | 'png',
  baseName: string,
): Promise<Uint8Array> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const { dataUrl, page } of images) {
    const base64 = dataUrl.split(',')[1];
    zip.file(`${baseName}-page-${page}.${format}`, base64, { base64: true });
  }
  const zipBytes = await zip.generateAsync({ type: 'uint8array' });
  return zipBytes;
}

export function downloadBlob(bytes: Uint8Array, filename: string, mimeType = 'application/pdf') {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Safari иногда начинает скачивание позже клика — откладываем revoke.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Safari иногда начинает скачивание позже клика — откладываем revoke.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Safari иногда начинает скачивание позже клика — откладываем revoke.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function parsePageSelection(
  selection: string,
  pageCount: number,
  options?: { allowDuplicates?: boolean },
): number[] {
  const allowDuplicates = options?.allowDuplicates ?? false;
  const trimmed = selection.trim();
  if (!trimmed) {
    throw new Error('Please specify at least one page.');
  }

  const tokens = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const result: number[] = [];
  const seen = new Set<number>();

  const pushPage = (pageNumber1Based: number) => {
    if (
      !Number.isInteger(pageNumber1Based) ||
      pageNumber1Based < 1 ||
      pageNumber1Based > pageCount
    ) {
      throw new Error(`Page ${pageNumber1Based} is out of range. Valid range is 1-${pageCount}.`);
    }
    const idx = pageNumber1Based - 1;
    if (allowDuplicates || !seen.has(idx)) {
      result.push(idx);
      seen.add(idx);
    }
  };

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const step = start <= end ? 1 : -1;
      for (let p = start; step > 0 ? p <= end : p >= end; p += step) {
        pushPage(p);
      }
      continue;
    }

    if (/^\d+$/.test(token)) {
      pushPage(parseInt(token, 10));
      continue;
    }

    throw new Error(`Invalid page token "${token}". Use format like "1,3,5-8".`);
  }

  if (result.length === 0) {
    throw new Error('No valid pages were selected.');
  }
  return result;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

// ============================================================
// Restored tool functions (2026-08-25)
// ============================================================
// Восстановлено после потерянного merge (см. .ai/changelog.md). Контракт
// сигнатур зафиксирован pdf-utils.test.ts, workflow-engine.ts и
// workers/pdf-worker.ts. Все растровые операции идут через createRenderCanvas
// (ADR-010), чтобы один и тот же код работал в Web Worker и на main thread.

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Общий пайплайн: рендерит каждую страницу через pdfjs и отдаёт канвас. */
async function withRenderedPages(
  file: File,
  opts: { scale?: number; onProgress?: (pct: number) => void },
  visit: (pageCtx: {
    index: number;
    numPages: number;
    widthPt: number;
    heightPt: number;
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: Ctx2D;
  }) => Promise<void>,
): Promise<void> {
  const scale = opts.scale ?? 1.5;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await openPdfWithPdfjs(bytes);
  for (let i = 1; i <= doc.numPages; i++) {
    if (opts.onProgress) opts.onProgress(5 + Math.round(((i - 1) / doc.numPages) * 85));
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale });
    const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
    await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas })
      .promise;
    try {
      await visit({
        index: i - 1,
        numPages: doc.numPages,
        widthPt: base.width,
        heightPt: base.height,
        canvas,
        ctx,
      });
    } finally {
      page.cleanup?.();
    }
  }
  opts.onProgress?.(95);
}

/** Собирает новый PDF из JPEG-снимков страниц исходного размера. */
async function pdfFromRasterizedPages(
  file: File,
  transform: (ctx: Ctx2D, canvas: HTMLCanvasElement | OffscreenCanvas) => void,
  opts: { scale?: number; quality?: number; onProgress?: (pct: number) => void } = {},
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  let lastError: unknown = null;

  await withRenderedPages(
    file,
    { scale: opts.scale, onProgress: opts.onProgress },
    async ({ widthPt, heightPt, canvas, ctx }) => {
      try {
        transform(ctx, canvas);
      } catch (err) {
        // Пиксельные преобразования не должны ронять весь документ.
        lastError = err;
      }
      const jpg = await canvasToBytes(canvas, 'image/jpeg', opts.quality ?? 0.9);
      const img = await out.embedJpg(jpg);
      const page = out.addPage([widthPt, heightPt]);
      page.drawImage(img, { x: 0, y: 0, width: widthPt, height: heightPt });
    },
  );

  if (out.getPageCount() === 0 && lastError) {
    throw lastError instanceof Error ? lastError : new Error('Rasterization failed.');
  }
  return out.save();
}

export async function grayscalePdf(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  return pdfFromRasterizedPages(
    file,
    (ctx, canvas) => {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      pixelLoop(imgData, (r, g, b) => {
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        return [lum, lum, lum];
      });
      ctx.putImageData(imgData, 0, 0);
    },
    { onProgress },
  );
}

export async function invertColors(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  return pdfFromRasterizedPages(
    file,
    (ctx, canvas) => {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      pixelLoop(imgData, (r, g, b) => [255 - r, 255 - g, 255 - b]);
      ctx.putImageData(imgData, 0, 0);
    },
    { onProgress },
  );
}

export async function scannerEffect(
  file: File,
  intensity: number = 0.5,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const amount = Math.min(1, Math.max(0, intensity));
  return pdfFromRasterizedPages(
    file,
    (ctx, canvas) => {
      const w = canvas.width;
      const h = canvas.height;
      // Небольшой наклон «криво положенного листа», чередуем направление.
      const angleDeg = 0.4 + amount * 0.8;
      const angle = (angleDeg * Math.PI) / 180;
      const rotated = createRenderCanvas(w + h * angle, h + w * angle);

      rotated.ctx.fillStyle = '#ffffff';
      rotated.ctx.fillRect(0, 0, rotated.canvas.width, rotated.canvas.height);
      rotated.ctx.translate(rotated.canvas.width / 2, rotated.canvas.height / 2);
      rotated.ctx.rotate(angle);
      rotated.ctx.drawImage(canvas as OffscreenCanvas, -w / 2, -h / 2);
      rotated.ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Пожелтение бумаги.
      rotated.ctx.globalCompositeOperation = 'multiply';
      rotated.ctx.fillStyle = `rgba(243, 233, 201, ${0.25 + amount * 0.35})`;
      rotated.ctx.fillRect(0, 0, rotated.canvas.width, rotated.canvas.height);
      rotated.ctx.globalCompositeOperation = 'source-over';

      // Зерно/шум.
      const dots = Math.round((rotated.canvas.width * rotated.canvas.height * amount) / 4000);
      rotated.ctx.fillStyle = 'rgba(60,50,40,0.16)';
      for (let i = 0; i < dots; i++) {
        const x = Math.random() * rotated.canvas.width;
        const y = Math.random() * rotated.canvas.height;
        rotated.ctx.fillRect(x, y, 1, 1);
      }

      // Переносим результат обратно в исходный канвас (растягивая до страницы).
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(rotated.canvas as OffscreenCanvas, 0, 0, w, h);
    },
    { quality: 0.85, onProgress },
  );
}

export async function removeBlankPages(
  file: File,
  threshold: number = 240,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcLib = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });
  const doc = await openPdfWithPdfjs(bytes.slice(0));

  const keepIndices: number[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(5 + Math.round(((i - 1) / doc.numPages) * 80));
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 0.5 });
    const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
    await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas })
      .promise;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    page.cleanup?.();

    let sum = 0;
    let sumSq = 0;
    let minLum = 255;
    const data = imgData.data;
    const total = data.length / 4;
    for (let p = 0; p < data.length; p += 4) {
      const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      sum += lum;
      sumSq += lum * lum;
      if (lum < minLum) minLum = lum;
    }
    const mean = sum / total;
    const std = Math.sqrt(Math.max(0, sumSq / total - mean * mean));

    // Страница «пустая», если она почти вся светлая И нет тёмного контента.
    const mostlyLight = mean >= threshold && std < 6;
    const hasContent = minLum < 200;
    if (!(mostlyLight && !hasContent)) keepIndices.push(i - 1);
  }

  if (keepIndices.length === 0) {
    throw new Error('All pages look blank — nothing to keep.');
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(srcLib, keepIndices);
  copied.forEach((p) => out.addPage(p));
  onProgress?.(98);
  return out.save();
}

export async function nUpPdf(
  file: File,
  n: 2 | 4 = 2,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const embedded = await src.embedPages(src.getPages());

  const out = await PDFDocument.create();
  const sheetW = n === 2 ? 842 : 595;
  const sheetH = n === 2 ? 595 : 842;
  const cellW = n === 2 ? sheetW / 2 : sheetW / 2;
  const cellH = n === 2 ? sheetH : sheetH / 2;
  const pad = 12;

  const placeOnSheet = (sheetPages: typeof embedded) => {
    const sheet = out.addPage([sheetW, sheetH]);
    const slots =
      n === 2
        ? [
            [pad, pad],
            [sheetW / 2 + pad / 2, pad],
          ]
        : [
            [pad, sheetH / 2],
            [sheetW / 2 + pad / 2, sheetH / 2],
            [pad, pad / 2],
            [sheetW / 2 + pad / 2, pad / 2],
          ];
    sheetPages.forEach((ep, slotIdx) => {
      const slot = slots[slotIdx];
      if (!slot || !ep) return;
      const availW = cellW - pad * 1.5;
      const availH = cellH - pad * 1.5;
      const fit = Math.min(availW / ep.width, availH / ep.height);
      const drawW = ep.width * fit;
      const drawH = ep.height * fit;
      const x = slot[0] + (availW - drawW) / 2;
      const y = slot[1] + (cellH - pad - drawH) / 2;
      sheet.drawPage(ep, { x, y, xScale: fit, yScale: fit });
    });
  };

  for (let i = 0; i < embedded.length; i += n) {
    placeOnSheet(embedded.slice(i, i + n));
    onProgress?.(10 + Math.round((i / embedded.length) * 80));
  }

  onProgress?.(98);
  return out.save();
}

export async function toSinglePage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = src.getPages();
  const embedded = await src.embedPages(pages);

  const pageWidth = Math.max(...embedded.map((ep) => ep.width));
  const gap = 0;
  const totalHeight = embedded.reduce((sum, ep) => sum + ep.height + gap, 0);
  if (totalHeight > 14400) {
    throw new Error(
      'The combined page is too tall even for PDF limits (14400pt). Split the document first.',
    );
  }

  const out = await PDFDocument.create();
  const single = out.addPage([pageWidth, totalHeight]);
  let cursorY = totalHeight;
  embedded.forEach((ep) => {
    cursorY -= ep.height;
    const x = (pageWidth - ep.width) / 2;
    single.drawPage(ep, { x, y: cursorY });
    cursorY -= gap;
    onProgress?.(10 + Math.round(((totalHeight - cursorY) / totalHeight) * 80));
  });

  onProgress?.(98);
  return out.save();
}

export async function bookletImposition(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = src.getPageCount();
  if (pageCount < 2) {
    throw new Error('Booklet imposition needs at least 2 pages.');
  }

  const embedded = await src.embedPages(src.getPages());
  // Дополняем до чётного числа «пустым слотом».
  const slots: ((typeof embedded)[number] | null)[] = [...embedded];
  if (slots.length % 2 !== 0) slots.push(null);

  const out = await PDFDocument.create();
  const sheetW = 842;
  const sheetH = 595;

  // Классический порядок для сшивки: [N,1], [2,N-1], [N-2,3], ...
  let lo = 0;
  let hi = slots.length - 1;
  while (lo < hi) {
    const pair = [slots[hi], slots[lo]];
    // Оборот только когда между lo и hi есть непечатанные страницы,
    // иначе получился бы дубликат лицевой стороны (для 2/6-страничных PDF).
    const backPair =
      hi - lo >= 3
        ? [slots[lo + 1], slots[hi - 1]]
        : ([null, null] as ((typeof embedded)[number] | null)[]);
    for (const pairSlots of [pair, backPair]) {
      const sheet = out.addPage([sheetW, sheetH]);
      const halfW = sheetW / 2;
      pairSlots.forEach((ep, sideIdx) => {
        if (!ep) return;
        const availW = halfW - 24;
        const availH = sheetH - 24;
        const fit = Math.min(availW / ep.width, availH / ep.height);
        const drawW = ep.width * fit;
        const drawH = ep.height * fit;
        const cx = sideIdx === 0 ? (halfW - drawW) / 2 : halfW + (halfW - drawW) / 2;
        sheet.drawPage(ep, { x: cx, y: (sheetH - drawH) / 2, xScale: fit, yScale: fit });
      });
    }
    lo += 2;
    hi -= 2;
    onProgress?.(10 + Math.round((lo / slots.length) * 80));
  }

  onProgress?.(98);
  return out.save();
}

async function renderPageJpegs(
  file: File,
  scale: number,
  onProgress?: (pct: number) => void,
): Promise<{ jpg: Uint8Array; widthPt: number; heightPt: number }[]> {
  const shots: { jpg: Uint8Array; widthPt: number; heightPt: number }[] = [];
  await withRenderedPages(file, { scale, onProgress }, async ({ widthPt, heightPt, canvas }) => {
    shots.push({ jpg: await canvasToBytes(canvas, 'image/jpeg', 0.88), widthPt, heightPt });
  });
  return shots;
}

export async function comparePdf(
  file: File,
  otherFile: File,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const shotsA = await renderPageJpegs(file, 1.2, (p) => onProgress?.(Math.round(p * 0.45)));
  const shotsB = await renderPageJpegs(otherFile, 1.2, (p) =>
    onProgress?.(45 + Math.round(p * 0.45)),
  );

  const out = await PDFDocument.create();
  const count = Math.max(shotsA.length, shotsB.length);
  const gap = 18;

  for (let i = 0; i < count; i++) {
    const a = shotsA[i];
    const b = shotsB[i];
    const leftW = a?.widthPt ?? 300;
    const rightW = b?.widthPt ?? 300;
    const sheetH = Math.max(a?.heightPt ?? 300, b?.heightPt ?? 300);
    const sheetW = leftW + rightW + gap * 3;

    const sheet = out.addPage([sheetW, sheetH]);
    if (a) {
      const imgA = await out.embedJpg(a.jpg);
      const yTop = sheetH - (a.heightPt ?? sheetH);
      sheet.drawImage(imgA, { x: gap, y: yTop, width: a.widthPt, height: a.heightPt });
    }
    if (b) {
      const imgB = await out.embedJpg(b.jpg);
      const yTop = sheetH - (b.heightPt ?? sheetH);
      sheet.drawImage(imgB, { x: gap * 2 + leftW, y: yTop, width: b.widthPt, height: b.heightPt });
    }
    onProgress?.(90 + Math.round(((i + 1) / count) * 8));
  }

  return out.save();
}

export interface PdfDiffLine {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
}

async function extractLinesPerPage(file: File): Promise<PdfDiffLine[][]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await openPdfWithPdfjs(bytes);
  const pages: PdfDiffLine[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const lines: PdfDiffLine[] = [];
    const items = (tc.items ?? []).filter((it: any) => typeof it.str === 'string' && it.str.trim());
    for (const it of items) {
      const [, , , , tx, ty] = it.transform;
      const pt = vp.convertToViewportPoint(tx, ty);
      lines.push({
        text: it.str,
        x: pt[0],
        y: Math.round(pt[1]),
        width: it.width || 0,
        size: Math.abs(it.transform[3]) || 10,
      });
    }
    pages.push(lines);
    page.cleanup?.();
  }
  return pages;
}

function normalizeForDiff(text: string): string {
  return normalizeSearchValue(text);
}

export async function pdfDiff(
  file: File,
  otherFile: File,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const [linesA, linesB] = await Promise.all([
    extractLinesPerPage(file),
    extractLinesPerPage(otherFile).then((pages) => {
      onProgress?.(30);
      return pages;
    }),
  ]);
  onProgress?.(55);

  const shotsA = await renderPageJpegs(file, 1.2);
  const shotsB = await renderPageJpegs(otherFile, 1.2);
  onProgress?.(75);

  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.HelveticaBold);
  const count = Math.max(shotsA.length, shotsB.length);
  const gap = 18;

  for (let i = 0; i < count; i++) {
    const a = shotsA[i];
    const b = shotsB[i];
    const setA = new Set((linesA[i] ?? []).map((l) => normalizeForDiff(l.text)));
    const setB = new Set((linesB[i] ?? []).map((l) => normalizeForDiff(l.text)));

    const removed = (linesA[i] ?? []).filter((l) => !setB.has(normalizeForDiff(l.text)));
    const added = (linesB[i] ?? []).filter((l) => !setA.has(normalizeForDiff(l.text)));

    const leftW = a?.widthPt ?? 300;
    const rightW = b?.widthPt ?? 300;
    const sheetH = Math.max(a?.heightPt ?? 300, b?.heightPt ?? 300) + 20;
    const sheetW = leftW + rightW + gap * 3;
    const sheet = out.addPage([sheetW, sheetH]);

    if (a) {
      const img = await out.embedJpg(a.jpg);
      const yTop = sheetH - a.heightPt - 10;
      sheet.drawImage(img, { x: gap, y: yTop, width: a.widthPt, height: a.heightPt });
      sheet.drawText('- removed', {
        x: gap,
        y: sheetH - 6,
        size: 9,
        font,
        color: rgb(0.8, 0.1, 0.1),
      });
      removed.slice(0, 12).forEach((line, k) => {
        const boxY = yTop + a.heightPt - line.y - line.size;
        sheet.drawRectangle({
          x: gap + line.x - 1,
          y: boxY - 1,
          width: Math.max(line.width, 8) + 2,
          height: line.size + 2,
          color: rgb(1, 0.85, 0.85),
          opacity: 0.55,
          borderColor: rgb(0.85, 0.15, 0.15),
          borderWidth: 0.5,
        });
        void k;
      });
    }
    if (b) {
      const img = await out.embedJpg(b.jpg);
      const yTop = sheetH - b.heightPt - 10;
      sheet.drawImage(img, { x: gap * 2 + leftW, y: yTop, width: b.widthPt, height: b.heightPt });
      sheet.drawText('+ added', {
        x: gap * 2 + leftW,
        y: sheetH - 6,
        size: 9,
        font,
        color: rgb(0.1, 0.6, 0.2),
      });
      added.slice(0, 12).forEach((line) => {
        const boxY = yTop + b.heightPt - line.y - line.size;
        sheet.drawRectangle({
          x: gap * 2 + leftW + line.x - 1,
          y: boxY - 1,
          width: Math.max(line.width, 8) + 2,
          height: line.size + 2,
          color: rgb(0.85, 1, 0.85),
          opacity: 0.55,
          borderColor: rgb(0.15, 0.7, 0.25),
          borderWidth: 0.5,
        });
      });
    }
  }

  onProgress?.(98);
  return out.save();
}

export type AutoRedactOptions = {
  redactEmails?: boolean;
  redactPhones?: boolean;
  redactSsn?: boolean;
  customRegex?: string;
};

const AUTO_REDACT_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  ssn: /\d{3}[-]\d{2}[-]\d{4}/g,
  iban: /[A-Z]{2}\d{2}[A-Z0-9]{4,30}/g,
};

export async function autoRedactPdf(
  file: File,
  options: AutoRedactOptions = {},
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const opts = { redactEmails: true, redactPhones: false, redactSsn: false, ...options };

  const regexes: RegExp[] = [];
  if (opts.redactEmails) regexes.push(AUTO_REDACT_PATTERNS.email);
  if (opts.redactPhones) regexes.push(AUTO_REDACT_PATTERNS.phone);
  if (opts.redactSsn) regexes.push(AUTO_REDACT_PATTERNS.ssn);
  regexes.push(AUTO_REDACT_PATTERNS.iban);
  if (opts.customRegex?.trim()) {
    try {
      regexes.push(new RegExp(opts.customRegex.trim(), 'gi'));
    } catch {
      throw new Error('Invalid regular expression.');
    }
  }

  if (regexes.length === 0) {
    throw new Error('Select at least one pattern or provide a custom regex.');
  }

  const matcher: TextMatcher = (_raw, normalized) =>
    regexes.some((re) => {
      re.lastIndex = 0;
      return re.test(_raw) || re.test(normalized);
    });

  const bytes = new Uint8Array(await file.arrayBuffer());
  return redactPagesWithMatcher(file, bytes, matcher, onProgress);
}

export async function splitPdfEveryN(file: File, everyN: number = 2): Promise<Uint8Array[]> {
  if (!Number.isInteger(everyN) || everyN < 1) {
    throw new Error('Chunk size must be a positive integer.');
  }
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const parts: Uint8Array[] = [];
  for (let start = 0; start < src.getPageCount(); start += everyN) {
    const out = await PDFDocument.create();
    const indices = Array.from(
      { length: Math.min(everyN, src.getPageCount() - start) },
      (_, k) => start + k,
    );
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));
    parts.push(await out.save());
  }
  return parts;
}

export async function splitPdfAllPages(file: File): Promise<Uint8Array[]> {
  return splitPdfEveryN(file, 1);
}

export async function splitResultsToZip(
  results: Uint8Array[],
  baseName: string = 'document',
): Promise<Uint8Array> {
  const padLength = String(results.length).length;
  return zipNamedFiles(
    results.map((bytes, i) => ({
      name: `${baseName}-part${String(i + 1).padStart(padLength, '0')}.pdf`,
      bytes,
    })),
  );
}

export async function zipNamedFiles(
  files: { name: string; bytes: Uint8Array }[],
): Promise<Uint8Array> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  files.forEach(({ name, bytes }) => zip.file(name, bytes));
  return zip.generateAsync({ type: 'uint8array' });
}

export async function looksLikePdfFile(file: File): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const sig = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
    if (sig.every((byte, idx) => head[idx] === byte)) return true;
    // Некоторые генераторы добавляют мусор перед %PDF — ищем в первых 1КБ.
    const text = String.fromCharCode(...head.subarray(0, 1024));
    return text.includes('%PDF-');
  } catch {
    return false;
  }
}

export async function splitBySize(
  file: File,
  maxMb: number = 10,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array[]> {
  if (!(maxMb > 0)) throw new Error('Max size must be greater than zero.');
  const maxBytes = maxMb * 1024 * 1024;

  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = src.getPageCount();
  if (totalPages === 0) throw new Error('The PDF has no pages.');

  const buildRange = async (start: number, endExclusive: number): Promise<Uint8Array> => {
    const out = await PDFDocument.create();
    const indices = Array.from({ length: endExclusive - start }, (_, k) => start + k);
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));
    return out.save({ useObjectStreams: true });
  };

  const avgPageBytes = bytes.byteLength / totalPages;
  const initialChunk = Math.max(1, Math.floor(maxBytes / Math.max(1, avgPageBytes)));

  // ADR-009: адаптивный бинарный поиск размера части.
  const findChunk = async (): Promise<number> => {
    let low = 1;
    let high = initialChunk;
    let best = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const probeEnd = Math.min(totalPages, mid);
      const saved = await buildRange(0, probeEnd);
      if (saved.byteLength <= maxBytes) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
        if (mid === 1) break;
      }
    }
    return best;
  };

  const chunk = Math.max(1, Math.min(initialChunk, await findChunk()));
  const parts: Uint8Array[] = [];

  for (let start = 0; start < totalPages; start += chunk) {
    const end = Math.min(totalPages, start + chunk);
    const saved = await buildRange(start, end);
    if (saved.byteLength > maxBytes && end - start > 1) {
      // Страницы тяжелее среднего — дробим часть пополам.
      let pieceStart = start;
      let pieceEnd = start + 1;
      while (pieceStart < end) {
        const piece = await buildRange(pieceStart, pieceEnd);
        const nextEnd = pieceEnd + 1;
        if (nextEnd <= end) {
          const bigger = await buildRange(pieceStart, nextEnd);
          if (bigger.byteLength <= maxBytes) {
            pieceEnd = nextEnd;
            continue;
          }
        }
        parts.push(piece);
        pieceStart = pieceEnd;
        pieceEnd = Math.min(end, pieceStart + 1);
      }
    } else {
      parts.push(saved);
    }
    onProgress?.(10 + Math.round((end / totalPages) * 85));
  }

  onProgress?.(98);
  return parts;
}

async function resolveOutline(
  doc: any,
): Promise<{ title: string; pageIndex: number; depth: number }[]> {
  const outline = (await doc.getOutline()) ?? [];
  const flat: { title: string; pageIndex: number; depth: number }[] = [];

  const walk = async (items: any[], depth: number) => {
    for (const item of items) {
      let dest = item.dest;
      try {
        if (typeof dest === 'string') dest = await doc.getDestination(dest);
        const ref = Array.isArray(dest) ? dest[0] : null;
        const pageIndex = ref != null ? await doc.getPageIndex(ref) : null;
        if (pageIndex != null) flat.push({ title: item.title || 'Untitled', pageIndex, depth });
      } catch {
        // Не резолвится — пропускаем закладку.
      }
      if (item.items?.length) await walk(item.items, depth + 1);
    }
  };

  await walk(outline, 0);
  return flat;
}

export async function splitByChapters(
  file: File,
  _onProgress?: (pct: number) => void,
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await openPdfWithPdfjs(bytes.slice(0));
  const chapters = await resolveOutline(doc);
  if (chapters.length === 0) {
    throw new Error('This PDF has no bookmarks/chapters to split by.');
  }

  const srcLib = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });
  const boundaries = Array.from(new Set(chapters.map((c) => c.pageIndex))).sort((a, b) => a - b);

  const safeName = (title: string) =>
    title
      .replace(/[^\w\-а-яё ]+/gi, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 48) || 'chapter';

  const usedNames = new Map<string, number>();
  const parts: { name: string; bytes: Uint8Array }[] = [];

  for (let b = 0; b < boundaries.length; b++) {
    const start = boundaries[b];
    const end = b + 1 < boundaries.length ? boundaries[b + 1] - 1 : srcLib.getPageCount() - 1;
    const out = await PDFDocument.create();
    const indices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
    const copied = await out.copyPages(srcLib, indices);
    copied.forEach((p) => out.addPage(p));

    const chapter = chapters.find((c) => c.pageIndex === start);
    let base = safeName(chapter?.title ?? `part-${b + 1}`);
    const seen = usedNames.get(base) ?? 0;
    usedNames.set(base, seen + 1);
    if (seen > 0) base = `${base}-${seen + 1}`;

    parts.push({ name: `${base}.pdf`, bytes: await out.save() });
  }

  return parts;
}

export async function overlayPdf(
  baseFile: File,
  overlayFile: File,
  opacity: number = 1,
  _onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const baseBytes = await baseFile.arrayBuffer();
  const overlayBytes = await overlayFile.arrayBuffer();

  const base = await PDFDocument.load(baseBytes, { ignoreEncryption: true });
  const overlay = await PDFDocument.load(overlayBytes, { ignoreEncryption: true });

  const embeddedOverlays = await base.embedPages(overlay.getPages());
  const pages = base.getPages();

  pages.forEach((page, i) => {
    const ep = embeddedOverlays[i % embeddedOverlays.length];
    if (!ep) return;
    const { width, height } = page.getSize();
    page.drawPage(ep, {
      x: 0,
      y: 0,
      xScale: width / ep.width,
      yScale: height / ep.height,
      opacity: Math.min(1, Math.max(0, opacity)),
    });
  });

  return base.save();
}

export async function cropPdf(
  file: File,
  options: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    autoCrop?: boolean;
  } = {},
  _onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const auto = Boolean(options.autoCrop);

  if (!auto) {
    const top = options.top ?? 0;
    const right = options.right ?? 0;
    const bottom = options.bottom ?? 0;
    const left = options.left ?? 0;
    if (top < 0 || right < 0 || bottom < 0 || left < 0) {
      throw new Error('Margins cannot be negative.');
    }

    doc.getPages().forEach((page) => {
      const box = page.getMediaBox();
      const newX = box.x + left;
      const newY = box.y + bottom;
      const newW = box.width - left - right;
      const newH = box.height - top - bottom;
      if (newW <= 10 || newH <= 10) {
        throw new Error('Margins are too large — nothing would remain of the page.');
      }
      page.setCropBox(newX, newY, newW, newH);
    });

    return doc.save();
  }

  // Auto-crop: определяем bbox контента по растру и проецируем его в
  // пользовательские координаты через viewport.convertToPdfPoint (BUG-08:
  // корректная работа с /Rotate).
  const bytesForJs = new Uint8Array(bytes.slice(0));
  const doc2 = await openPdfWithPdfjs(bytesForJs);

  for (let i = 1; i <= doc2.numPages; i++) {
    const page = await doc2.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
    await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas })
      .promise;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    page.cleanup?.();

    const data = imgData.data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const p = (y * canvas.width + x) * 4;
        const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        if (lum < 235) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const libPage = doc.getPage(i - 1);
    const mediaBox = libPage.getMediaBox();

    if (maxX < 0) {
      // Полностью пустая страница — оставляем как есть.
      continue;
    }

    const padPx = 6;
    minX = Math.max(0, minX - padPx);
    minY = Math.max(0, minY - padPx);
    maxX = Math.min(canvas.width - 1, maxX + padPx);
    maxY = Math.min(canvas.height - 1, maxY + padPx);

    // Верх канваса — это верх viewport; в pdfjs координаты уже viewport-space.
    const topLeft = vp.convertToPdfPoint(minX, minY);
    const bottomRight = vp.convertToPdfPoint(maxX, maxY);

    const ux = Math.min(topLeft[0], bottomRight[0]);
    const uy = Math.min(topLeft[1], bottomRight[1]);
    const uw = Math.abs(bottomRight[0] - topLeft[0]);
    const uh = Math.abs(bottomRight[1] - topLeft[1]);

    const clampedX = Math.max(mediaBox.x, ux);
    const clampedY = Math.max(mediaBox.y, uy);
    const clampedW = Math.min(mediaBox.x + mediaBox.width, ux + uw) - clampedX;
    const clampedH = Math.min(mediaBox.y + mediaBox.height, uy + uh) - clampedY;

    if (clampedW > 10 && clampedH > 10) {
      libPage.setCropBox(clampedX, clampedY, clampedW, clampedH);
    }
  }

  return doc.save();
}

const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
  tabloid: [792, 1224],
};

export async function resizePages(
  file: File,
  targetSize: keyof typeof PAGE_SIZES = 'a4',
  _onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const target = PAGE_SIZES[targetSize];
  if (!target) throw new Error(`Unknown page size "${targetSize}".`);

  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const embedded = await src.embedPages(src.getPages());

  const out = await PDFDocument.create();
  embedded.forEach((ep) => {
    const page = out.addPage(target);
    const fit = Math.min(target[0] / ep.width, target[1] / ep.height);
    const drawW = ep.width * fit;
    const drawH = ep.height * fit;
    page.drawPage(ep, {
      x: (target[0] - drawW) / 2,
      y: (target[1] - drawH) / 2,
      xScale: fit,
      yScale: fit,
    });
  });

  return out.save();
}

export async function addBlankPages(file: File, positions: string): Promise<Uint8Array> {
  const trimmed = positions.trim();
  if (!trimmed) throw new Error('Specify where to insert blank pages (e.g. "1, 3, end").');

  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = src.getPageCount();

  const tokens = trimmed
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const insertBefore = new Set<number>();

  for (const token of tokens) {
    if (token === 'end') {
      insertBefore.add(pageCount + 1);
      continue;
    }
    const num = parseInt(token, 10);
    if (!Number.isInteger(num) || num < 1 || num > pageCount + 1) {
      throw new Error(`Position "${token}" is out of range (1-${pageCount + 1}).`);
    }
    insertBefore.add(num);
  }

  const templateSize = src.getPage(pageCount - 1).getSize();
  const out = await PDFDocument.create();

  for (let i = 1; i <= pageCount; i++) {
    if (insertBefore.has(i)) {
      const sizeObj = i <= pageCount ? src.getPage(i - 1).getSize() : templateSize;
      out.addPage([sizeObj.width, sizeObj.height]);
    }
    const [copied] = await out.copyPages(src, [i - 1]);
    out.addPage(copied);
  }
  if (insertBefore.has(pageCount + 1)) {
    out.addPage([templateSize.width, templateSize.height]);
  }

  return out.save();
}

export async function batesNumbering(
  file: File,
  options: {
    prefix?: string;
    start?: number;
    digits?: number;
    position?:
      'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'top-center';
  } = {},
  _onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const prefix = options.prefix ?? '';
  const start = options.start ?? 1;
  const digits = options.digits ?? 6;
  const position = options.position ?? 'bottom-right';

  if (!Number.isInteger(start) || start < 0)
    throw new Error('Start must be a non-negative integer.');
  if (!Number.isInteger(digits) || digits < 1 || digits > 12)
    throw new Error('Digits must be between 1 and 12.');

  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const needsUni = needsUnicode(prefix);
  const font = needsUni
    ? await embedUnicodeFont(pdf)
    : await pdf.embedFont(StandardFonts.Helvetica);

  pdf.getPages().forEach((page, i) => {
    const text = `${prefix}${String(start + i).padStart(digits, '0')}`;
    const { width, height } = page.getSize();
    const fontSize = 11;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = width - textWidth - 24;
    let y = 20;
    if (position === 'bottom-center') x = width / 2 - textWidth / 2;
    else if (position === 'bottom-left') x = 24;
    else if (position === 'top-right') y = height - 32;
    else if (position === 'top-left') {
      x = 24;
      y = height - 32;
    } else if (position === 'top-center') {
      x = width / 2 - textWidth / 2;
      y = height - 32;
    }
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
  });

  return pdf.save();
}

export async function addBackground(
  file: File,
  color: string = '#fff7cc',
  opacity: number = 0.6,
): Promise<Uint8Array> {
  const hex = color.replace('#', '');
  if (!/^([0-9a-f]{6})$/i.test(hex)) throw new Error('Use a hex color like #fff7cc.');

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(r, g, b),
      opacity: Math.min(1, Math.max(0, opacity)),
    });
  });
  return pdf.save();
}

// ============================================================
// Metadata / sanitize / bookmarks / forms
// ============================================================

export interface PdfMetadataFields {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
}

function iso(date: Date | undefined): string {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
}

export async function getPdfMetadata(file: File): Promise<PdfMetadataFields> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return {
    title: pdf.getTitle() ?? '',
    author: pdf.getAuthor() ?? '',
    subject: pdf.getSubject() ?? '',
    keywords: pdf.getKeywords() ?? '',
    creator: pdf.getCreator() ?? '',
    producer: pdf.getProducer() ?? '',
    creationDate: iso(pdf.getCreationDate()),
    modificationDate: iso(pdf.getModificationDate()),
  };
}

export async function setPdfMetadata(
  file: File,
  fields: Partial<PdfMetadataFields>,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  if (fields.title !== undefined) pdf.setTitle(fields.title);
  if (fields.author !== undefined) pdf.setAuthor(fields.author);
  if (fields.subject !== undefined) pdf.setSubject(fields.subject);
  if (fields.keywords !== undefined)
    pdf.setKeywords(fields.keywords.split(/[,;]\s*/).filter(Boolean));
  if (fields.creator !== undefined) pdf.setCreator(fields.creator);
  if (fields.producer !== undefined) pdf.setProducer(fields.producer);
  if (fields.creationDate) {
    const d = new Date(fields.creationDate);
    if (!Number.isNaN(d.getTime())) pdf.setCreationDate(d);
  }
  if (fields.modificationDate) {
    const d = new Date(fields.modificationDate);
    if (!Number.isNaN(d.getTime())) pdf.setModificationDate(d);
  }
  pdf.setModificationDate(new Date());

  return pdf.save();
}

function clearMetadata(pdf: PDFDocument) {
  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setCreator('');
  pdf.setProducer('');
  const epoch = new Date(0);
  pdf.setCreationDate(epoch);
  pdf.setModificationDate(epoch);
}

export async function sanitizePdf(file: File): Promise<Uint8Array> {
  // Полная пересборка: копируются только страницы, поэтому JavaScript,
  // именованные destinations, attachments и прочая «обвязка» отваливаются.
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, src.getPageIndices());
  copied.forEach((p) => out.addPage(p));
  clearMetadata(out);
  return out.save();
}

/**
 * Best-effort подготовка к архивному хранению. Настоящая сертификация PDF/A
 * невозможна в браузере (нужны цветовые профили и валидация), поэтому функция
 * делает то, что реально повышает «архивность»: пересборка без JS/attachments
 * и полная очистка метаданных.
 */
export async function convertToPdfA(
  file: File,
  _options?: Record<string, never>,
): Promise<Uint8Array> {
  return sanitizePdf(file);
}

export async function pdfBookmarks(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await openPdfWithPdfjs(bytes);
  const flat = await resolveOutline(doc);
  if (flat.length === 0) {
    throw new Error('This PDF has no bookmarks/outline.');
  }

  const lines = flat.map((item) => {
    const indent = '  '.repeat(Math.min(item.depth, 6));
    return `${indent}${item.title} ..... ${item.pageIndex + 1}`;
  });
  return lines.join('\n');
}

// ============================================================
// Forms
// ============================================================

export interface PdfFormFieldInfo {
  name: string;
  type:
    | 'text'
    | 'checkbox'
    | 'dropdown'
    | 'optionlist'
    | 'radiogroup'
    | 'signature'
    | 'button'
    | 'unknown';
  value: string;
}

function fieldTypeName(field: any): PdfFormFieldInfo['type'] {
  const ctor = field?.constructor?.name ?? '';
  if (ctor.includes('TextField')) return 'text';
  if (ctor.includes('CheckBox')) return 'checkbox';
  if (ctor.includes('Dropdown')) return 'dropdown';
  if (ctor.includes('OptionList')) return 'optionlist';
  if (ctor.includes('RadioGroup')) return 'radiogroup';
  if (ctor.includes('Signature')) return 'signature';
  if (ctor.includes('Button')) return 'button';
  return 'unknown';
}

function fieldValue(field: any): string {
  try {
    const type = fieldTypeName(field);
    if (type === 'text') return field.getText() ?? '';
    if (type === 'checkbox') return field.isChecked() ? 'true' : 'false';
    if (type === 'dropdown') return field.getSelected()?.[0] ?? '';
    if (type === 'optionlist') return (field.getSelected() ?? []).join(', ');
    if (type === 'radiogroup') return field.getSelected() ?? '';
    return '';
  } catch {
    return '';
  }
}

export async function extractFormFields(file: File): Promise<PdfFormFieldInfo[]> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  try {
    form.updateFieldAppearances();
  } catch {
    // Некорректные appearances не мешают чтению значений.
  }
  return form.getFields().map((field: any) => ({
    name: field.getName(),
    type: fieldTypeName(field),
    value: fieldValue(field),
  }));
}

export const getPdfFormFields = extractFormFields;

export async function fillPdfForm(
  file: File,
  values: Record<string, string | boolean>,
): Promise<Uint8Array> {
  const entries = Object.entries(values ?? {});
  if (entries.length === 0) throw new Error('No field values provided.');

  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  const fields = form.getFields();
  const namesInDoc = new Set(fields.map((f: any) => f.getName()));

  for (const [name, rawValue] of entries) {
    if (!namesInDoc.has(name)) continue;
    const field = fields.find((f: any) => f.getName() === name);
    const f = field as any;
    const type = fieldTypeName(field);
    try {
      if (type === 'text') {
        f.setText(typeof rawValue === 'string' ? rawValue : String(rawValue));
      } else if (type === 'checkbox') {
        if (rawValue === true || rawValue === 'true') f.check();
        else f.uncheck();
      } else if (type === 'dropdown' || type === 'radiogroup') {
        if (typeof rawValue === 'string' && rawValue) f.select(rawValue);
      } else if (type === 'optionlist') {
        if (typeof rawValue === 'string' && rawValue) f.select(rawValue);
      }
    } catch {
      throw new Error(
        `Could not set value for field "${name}". Check that the value matches the field options.`,
      );
    }
  }

  try {
    form.updateFieldAppearances();
  } catch {
    // ignore appearance issues — значения всё равно сохранены
  }
  return pdf.save();
}

// ============================================================
// Pure text/layout helpers (спецификация: pdf-utils.test.ts)
// ============================================================

export function detectFontStyle(fontName?: string): { bold: boolean; italic: boolean } {
  if (!fontName) return { bold: false, italic: false };
  const bold = /bold|black|heavy/i.test(fontName);
  const italic = /italic|oblique/i.test(fontName);
  return { bold, italic };
}

/** x — начало строки, endX — конец, pageWidth — ширина страницы. */
export function lineAlignment(
  x: number,
  endX: number,
  pageWidth: number,
): 'left' | 'center' | 'right' {
  if (!pageWidth) return 'left';
  const leftMargin = x;
  const rightMargin = pageWidth - endX;
  const tolerance = Math.max(6, pageWidth * 0.02);
  if (Math.abs(leftMargin - rightMargin) <= tolerance) return 'center';
  return leftMargin < rightMargin ? 'left' : 'right';
}

export function clusterColumns(xs: number[], tolerance: number): number[] {
  if (xs.length === 0) return [];
  const sorted = [...xs].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const cluster = clusters[clusters.length - 1];
    if (sorted[i] - cluster[cluster.length - 1] <= tolerance) {
      cluster.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }

  return clusters.map((group) => group.reduce((s, v) => s + v, 0) / group.length);
}

export function assignToColumn(x: number, columns: number[]): number {
  if (columns.length === 0) return 0;
  let best = 0;
  let bestDist = Math.abs(x - columns[0]);
  for (let i = 1; i < columns.length; i++) {
    const dist = Math.abs(x - columns[i]);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

export interface TableRegion {
  start: number;
  end: number;
  columns: number[];
}

export function detectTableRegions(
  cellsPerLine: { x: number }[][],
  lineHeight: number,
): TableRegion[] {
  const regions: TableRegion[] = [];
  const columnTolerance = Math.max(8, lineHeight * 1.2);
  let runStart = -1;

  const flushRun = (endExclusive: number) => {
    if (runStart === -1 || endExclusive - runStart < 2) {
      runStart = -1;
      return;
    }
    const xs: number[] = [];
    for (let i = runStart; i < endExclusive; i++) {
      cellsPerLine[i].forEach((cell) => xs.push(cell.x));
    }
    regions.push({
      start: runStart,
      end: endExclusive - 1,
      columns: clusterColumns(xs, columnTolerance),
    });
    runStart = -1;
  };

  cellsPerLine.forEach((cells, index) => {
    const isTabular = cells.length >= 2;
    if (isTabular && runStart === -1) runStart = index;
    if (!isTabular) flushRun(index);
  });
  flushRun(cellsPerLine.length);

  return regions;
}

export function buildExcelRowsFromLineCells(
  cellsPerLine: { text: string; x: number }[][],
  lineHeight: number,
): string[][] {
  const rows: string[][] = [];
  const regions = detectTableRegions(cellsPerLine, lineHeight);
  const regionByStart = new Map(regions.map((r) => [r.start, r]));

  let i = 0;
  while (i < cellsPerLine.length) {
    const region = regionByStart.get(i);

    if (region) {
      for (let lineIdx = region.start; lineIdx <= region.end; lineIdx++) {
        const row = new Array<string>(region.columns.length).fill('');
        const sortedCells = [...cellsPerLine[lineIdx]].sort((a, b) => a.x - b.x);
        for (const cell of sortedCells) {
          const col = assignToColumn(cell.x, region.columns);
          row[col] = row[col] ? `${row[col]} ${cell.text}` : cell.text;
        }
        rows.push(row);
      }
      i = region.end + 1;
      continue;
    }

    const joined = cellsPerLine[i]
      .map((cell) => cell.text)
      .join(' ')
      .trim();
    rows.push([joined]);
    i += 1;
  }

  return rows;
}

export function fillColorToHex(
  colorSpace: 'rgb' | 'gray' | 'cmyk',
  components: number[],
): string | undefined {
  if (!components || components.length === 0) return undefined;

  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value * 255)))
      .toString(16)
      .padStart(2, '0');

  if (colorSpace === 'rgb' && components.length >= 3) {
    const [r, g, b] = components;
    if (r <= 0.05 && g <= 0.05 && b <= 0.05) return undefined;
    return `${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  if (colorSpace === 'gray' && components.length >= 1) {
    const v = components[0];
    if (v <= 0.05 || v >= 0.95) return undefined;
    return `${toHex(v)}${toHex(v)}${toHex(v)}`;
  }

  if (colorSpace === 'cmyk' && components.length >= 4) {
    const [c, m, y, k] = components;
    if (k >= 0.95) return undefined;
    const r = (1 - c) * (1 - k);
    const g = (1 - m) * (1 - k);
    const b = (1 - y) * (1 - k);
    if (r <= 0.05 && g <= 0.05 && b <= 0.05) return undefined;
    return `${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return undefined;
}

export function dominantString(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  let best: string | undefined;
  let bestCount = 0;

  for (const value of values) {
    const next = (counts.get(value) ?? 0) + 1;
    counts.set(value, next);
    if (next > bestCount) {
      best = value;
      bestCount = next;
    }
  }

  return best;
}

export function ocrRenderScale(
  widthPt: number,
  heightPt: number,
  targetLongSide = 1800,
  minScale = 0.5,
  maxScale = 3,
): number {
  const longSide = Math.max(widthPt, heightPt, 1);
  const raw = targetLongSide / longSide;
  return Math.min(maxScale, Math.max(minScale, raw));
}

// ============================================================
// Text layout extraction (shared by Word / Excel / Markdown)
// ============================================================

export interface PdfLayoutItem {
  text: string;
  x: number;
  size: number;
  bold: boolean;
  italic: boolean;
}

export interface PdfLayoutLine extends PdfLayoutItem {
  width: number;
  alignment: 'left' | 'center' | 'right';
  items: PdfLayoutItem[];
}

export interface PdfLayoutPage {
  width: number;
  height: number;
  lines: PdfLayoutLine[];
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
  fontName?: string;
}

async function extractRawTextItems(
  file: File,
): Promise<{ width: number; height: number; items: RawTextItem[] }[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await openPdfWithPdfjs(bytes);
  const pages: { width: number; height: number; items: RawTextItem[] }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const styles = tc.styles ?? {};
    const items: RawTextItem[] = [];

    for (const item of tc.items ?? []) {
      if (typeof item.str !== 'string' || !item.str.trim()) continue;
      const [, , , , tx, ty] = item.transform;
      const pt = vp.convertToViewportPoint(tx, ty);
      const size = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 10;
      const style = styles[item.fontName ?? ''];
      items.push({
        str: item.str,
        x: pt[0],
        y: pt[1],
        width: item.width || 0,
        size,
        fontName: style?.fontFamily as string | undefined,
      });
    }

    pages.push({ width: vp.width, height: vp.height, items });
    page.cleanup?.();
  }

  return pages;
}

function groupItemsIntoLines(items: RawTextItem[], pageWidth: number): PdfLayoutLine[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfLayoutLine[] = [];
  let current: RawTextItem[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const size = dominantString(current.map((it) => String(Math.round(it.size))));
    const lineSize = size ? Number(size) : current[0].size;
    const fontStyle = detectFontStyle(dominantString(current.map((it) => it.fontName ?? '')) ?? '');
    const x = Math.min(...current.map((it) => it.x));
    const last = current[current.length - 1];
    const width = last.x + last.width - x;
    lines.push({
      text: current
        .map((it) => it.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
      x,
      width: Math.max(width, 0),
      size: lineSize,
      bold: fontStyle.bold,
      italic: fontStyle.italic,
      alignment: lineAlignment(x, x + width, pageWidth),
      items: current.map((it) => ({
        text: it.str,
        x: it.x,
        size: it.size,
        bold: detectFontStyle(it.fontName).bold,
        italic: detectFontStyle(it.fontName).italic,
      })),
    });
    current = [];
  };

  for (const item of sorted) {
    if (current.length === 0) {
      current.push(item);
      continue;
    }
    const prev = current[current.length - 1];
    const tolerance = Math.max(2, Math.min(prev.size, item.size) * 0.45);
    if (Math.abs(prev.y - item.y) <= tolerance) {
      current.push(item);
    } else {
      flush();
      current.push(item);
    }
  }
  flush();

  return lines;
}

async function extractPdfLayout(file: File): Promise<PdfLayoutPage[]> {
  const rawPages = await extractRawTextItems(file);
  return rawPages.map((page) => ({
    width: page.width,
    height: page.height,
    lines: groupItemsIntoLines(page.items, page.width),
  }));
}

// ============================================================
// PDF → Office / Markdown
// ============================================================

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const DOCX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const DOCX_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

interface DocxParagraph {
  text: string;
  bold: boolean;
  italic: boolean;
  halfPoints: number;
  align: 'left' | 'center' | 'right';
  headingLevel: number;
}

function docxParagraphXml(p: DocxParagraph): string {
  const props: string[] = [];
  if (p.headingLevel > 0) {
    props.push(`<w:pStyle w:val="Heading${p.headingLevel}"/>`);
  }
  props.push(`<w:jc w:val="${p.align}"/>`);
  const runProps: string[] = [];
  if (p.bold) runProps.push('<w:b/>');
  if (p.italic) runProps.push('<w:i/>');
  runProps.push(`<w:sz w:val="${p.halfPoints}"/>`);
  runProps.push(`<w:szCs w:val="${p.halfPoints}"/>`);

  return `<w:p><w:pPr>${props.join('')}</w:pPr><w:r><w:rPr>${runProps.join('')}</w:rPr><w:t xml:space="preserve">${escapeXml(p.text)}</w:t></w:r></w:p>`;
}

/**
 * Минимальный валидный DOCX (OOXML) без внешних генераторов: достаточно для
 * Word/LibreOffice/Google Docs. Стили заголовков объявлены в document.xml.
 */
async function buildDocx(
  paragraphs: DocxParagraph[],
  pageSize: [number, number],
): Promise<Uint8Array> {
  const body = paragraphs.map(docxParagraphXml).join('');
  const sectPr = `<w:sectPr><w:pgSz w:w="${Math.round(pageSize[0] * 20)}" w:h="${Math.round(pageSize[1] * 20)}"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>`;
  const heading1Style = `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${sectPr}</w:body></w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${heading1Style}<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:outlineLvl w:val="2"/></w:pPr></w:style></w:styles>`;

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', DOCX_CONTENT_TYPES);
  zip.folder('_rels')?.file('.rels', DOCX_RELS);
  const word = zip.folder('word');
  word?.file('document.xml', documentXml);
  word
    ?.folder('_rels')
    ?.file(
      'document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
    );
  word?.file('styles.xml', stylesXml);

  return zip.generateAsync({ type: 'uint8array' });
}

export async function pdfToWord(file: File): Promise<Uint8Array> {
  const layout = await extractPdfLayout(file);
  if (layout.every((page) => page.lines.length === 0)) {
    throw new Error(
      'No extractable text found. If this is a scan, run OCR PDF first, then convert to Word.',
    );
  }

  const allSizes = layout
    .flatMap((page) => page.lines.map((line) => line.size))
    .sort((a, b) => a - b);
  const medianSize = allSizes[Math.floor(allSizes.length / 2)] || 12;

  const paragraphs: DocxParagraph[] = [];
  for (const page of layout) {
    for (const line of page.lines) {
      const ratio = line.size / medianSize;
      const headingLevel = ratio >= 1.7 ? 1 : ratio >= 1.35 ? 2 : 0;
      const level = headingLevel || (line.bold && line.text.length < 80 && ratio >= 1.15 ? 3 : 0);
      paragraphs.push({
        text: line.text,
        bold: line.bold,
        italic: line.italic,
        halfPoints: Math.round(line.size * 2 * 0.92),
        align: line.alignment,
        headingLevel: level,
      });
    }
  }

  const firstPage = layout[0];
  return buildDocx(paragraphs, [firstPage?.width ?? 595, firstPage?.height ?? 842]);
}

export async function pdfToExcel(file: File): Promise<Uint8Array> {
  const layout = await extractPdfLayout(file);
  const XLSX: any = await import('xlsx');

  const workbook = XLSX.utils.book_new();
  let addedSheets = 0;

  layout.forEach((page, pageIndex) => {
    // Сливаем соседние items с маленьким горизонтальным разрывом в одну ячейку.
    const cellsPerLine = page.lines.map((line) => {
      const merged: { text: string; x: number }[] = [];
      const sortedItems = [...line.items].sort((a, b) => a.x - b.x);
      for (const item of sortedItems) {
        const prev = merged[merged.length - 1];
        const gapThreshold = line.size * 1.6;
        if (prev && item.x - prev.x < gapThreshold) {
          prev.text = `${prev.text} ${item.text}`.replace(/\s+/g, ' ');
        } else {
          merged.push({ text: item.text, x: item.x });
        }
      }
      return merged.filter((cell) => cell.text.trim());
    });

    const rows = buildExcelRowsFromLineCells(cellsPerLine, page.lines[0]?.size ?? 12);
    if (rows.length === 0) return;

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, `Page ${pageIndex + 1}`);
    addedSheets += 1;
  });

  if (addedSheets === 0) {
    throw new Error('No extractable content found for Excel.');
  }

  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Uint8Array(out);
}

export async function excelToPdf(file: File): Promise<Uint8Array> {
  const XLSX: any = await import('xlsx');
  const data = new Uint8Array(await file.arrayBuffer());
  const workbook = XLSX.read(data, { type: 'array' });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const unicodeFont = needsUnicode(workbook.SheetNames.join(''))
    ? await embedUnicodeFont(pdf)
    : null;
  const activeFont = unicodeFont ?? font;
  const fontSize = 10;
  const lineHeight = fontSize * 1.5;
  const margin = 36;

  workbook.SheetNames.forEach((sheetName: string) => {
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
    });
    let page = pdf.addPage([842, 595]); // A4 landscape
    let y = 595 - margin;

    const drawText = (text: string, x: number, isBold = false) =>
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font: isBold && !needsUnicode(text) ? boldFont : activeFont,
        color: rgb(0.1, 0.1, 0.1),
      });

    page.drawText(sheetName, {
      x: margin,
      y,
      size: 14,
      font: activeFont,
      color: rgb(0.05, 0.05, 0.05),
    });
    y -= lineHeight * 1.6;

    aoa.forEach((row) => {
      if (y < margin) {
        page = pdf.addPage([842, 595]);
        y = 595 - margin;
      }
      let x = margin;
      row.forEach((cell) => {
        const text = String(cell ?? '').slice(0, 40);
        drawText(text, x);
        x += Math.max(70, activeFont.widthOfTextAtSize(text, fontSize) + 24);
        if (x > 842 - margin * 2) x = margin;
      });
      y -= lineHeight;
    });
  });

  return pdf.save();
}

export async function pdfToMarkdown(file: File): Promise<string> {
  const layout = await extractPdfLayout(file);
  if (layout.every((page) => page.lines.length === 0)) {
    throw new Error('No extractable text found. If this is a scan, run OCR PDF first.');
  }

  const allSizes = layout.flatMap((page) => page.lines.map((l) => l.size));
  const medianSize = allSizes.slice().sort((a, b) => a - b)[Math.floor(allSizes.length / 2)] || 12;

  const chunks: string[] = [];
  layout.forEach((page) => {
    const lines: string[] = [];
    page.lines.forEach((line) => {
      const ratio = line.size / medianSize;
      const text = line.text.replace(/([*_`#])/g, '\\$1');
      if (ratio >= 1.7) lines.push(`# ${text}`);
      else if (ratio >= 1.35) lines.push(`## ${text}`);
      else if (ratio >= 1.15 && line.text.length < 90) lines.push(`### ${text}`);
      else lines.push(text);
    });
    chunks.push(lines.join('\n\n'));
  });

  return chunks.join('\n\n---\n\n');
}

// ============================================================
// Extract images
// ============================================================

const TINY_TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export async function extractImages(
  file: File,
  _onProgress?: (pct: number) => void,
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const results: { name: string; bytes: Uint8Array }[] = [];
  let imageCounter = 0;

  for (let p = 0; p < pdf.getPageCount(); p++) {
    const page = pdf.getPage(p);
    const resources = page.node.Resources();
    if (!resources) continue;

    let xObjects: PDFDict | undefined;
    try {
      xObjects = resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
    } catch {
      xObjects = undefined;
    }
    if (!xObjects) continue;

    for (const [, value] of xObjects.entries()) {
      try {
        const stream = pdf.context.lookup(value);
        if (!(stream instanceof PDFRawStream)) continue;
        const subtype = stream.dict.lookup(PDFName.of('Subtype'));
        if (subtype !== PDFName.of('Image')) continue;

        const filter = stream.dict.lookup(PDFName.of('Filter'));
        const filterNames: string[] = [];
        if (filter instanceof PDFName) filterNames.push(filter.asString());
        else if (filter instanceof PDFArray) {
          for (let f = 0; f < filter.size(); f++) {
            const entry = filter.lookup(f);
            if (entry instanceof PDFName) filterNames.push(entry.asString());
          }
        }

        const rawBytes = stream.getContents();
        imageCounter += 1;

        if (filterNames.includes('DCTDecode')) {
          results.push({
            name: `image-p${p + 1}-${imageCounter}.jpg`,
            bytes: new Uint8Array(rawBytes),
          });
          continue;
        }

        if (filterNames.includes('FlateDecode')) {
          const decoded = decodePDFRawStream(stream).decode();
          const width = Number(stream.dict.lookup(PDFName.of('Width')) ?? 0);
          const height = Number(stream.dict.lookup(PDFName.of('Height')) ?? 0);
          const bpc = Number(stream.dict.lookup(PDFName.of('BitsPerComponent')) ?? 8);
          const colorSpace = stream.dict.lookup(PDFName.of('ColorSpace'));
          const csName = colorSpace instanceof PDFName ? colorSpace.asString() : '';

          if (
            width > 0 &&
            height > 0 &&
            bpc === 8 &&
            (csName === '/DeviceRGB' || csName === '/DeviceGray')
          ) {
            const channels = csName === '/DeviceRGB' ? 3 : 1;
            const expected = width * height * channels;
            if (decoded.length >= expected) {
              const rgba = new Uint8ClampedArray(width * height * 4);
              for (let px = 0; px < width * height; px++) {
                if (channels === 3) {
                  rgba[px * 4] = decoded[px * 3];
                  rgba[px * 4 + 1] = decoded[px * 3 + 1];
                  rgba[px * 4 + 2] = decoded[px * 3 + 2];
                } else {
                  const gray = decoded[px];
                  rgba[px * 4] = gray;
                  rgba[px * 4 + 1] = gray;
                  rgba[px * 4 + 2] = gray;
                }
                rgba[px * 4 + 3] = 255;
              }
              const { canvas, ctx } = createRenderCanvas(width, height);
              if (typeof ImageData === 'undefined') {
                throw new Error('This environment does not support raw image decoding.');
              }
              ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
              const pngBytes = await canvasToBytes(canvas, 'image/png');
              results.push({ name: `image-p${p + 1}-${imageCounter}.png`, bytes: pngBytes });
              continue;
            }
          }
        }

        // Остальные фильтры (JPX/JBIG2/CCITT) пока не декодируем.
        void rawBytes;
      } catch {
        // Повреждённая картинка не должна ронять извлечение остальных.
      }
    }
  }

  if (results.length === 0) {
    throw new Error(
      'No directly extractable images found (the PDF may use unsupported compression).',
    );
  }

  return results;
}

/** Заменяет картинки на 1×1 прозрачный PNG — контент страниц остаётся валидным. */
async function stripImageXObjects(pdf: PDFDocument): Promise<number> {
  const tinyImage = await pdf.embedPng(TINY_TRANSPARENT_PNG_BASE64);
  let stripped = 0;

  for (const page of pdf.getPages()) {
    const resources = page.node.Resources();
    if (!resources) continue;
    let xObjects: PDFDict | undefined;
    try {
      xObjects = resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
    } catch {
      xObjects = undefined;
    }
    if (!xObjects) continue;

    for (const [key, value] of xObjects.entries()) {
      try {
        const stream = pdf.context.lookup(value);
        if (!(stream instanceof PDFRawStream)) continue;
        const subtype = stream.dict.lookup(PDFName.of('Subtype'));
        if (subtype === PDFName.of('Image')) {
          xObjects.set(key, tinyImage.ref);
          stripped += 1;
        }
      } catch {
        // skip
      }
    }
  }

  return stripped;
}

export async function removeImages(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const stripped = await stripImageXObjects(pdf);
  if (stripped === 0) {
    throw new Error('No embedded raster images found in this PDF.');
  }
  return pdf.save();
}

// ============================================================
// OCR (tesseract.js) и речь (Web Speech)
// ============================================================

const OCR_LANGUAGES: Record<string, string> = {
  eng: 'en-US',
  rus: 'ru-RU',
  spa: 'es-ES',
  fra: 'fr-FR',
  deu: 'de-DE',
  por: 'pt-BR',
  ita: 'it-IT',
  nld: 'nl-NL',
};

/**
 * Строит «сэндвич»: растровый слой + невидимый текстовый слой (opacity 0),
 * чтобы PDF стал searchable/selectable. OCR идёт на main thread — tesseract.js
 * создаёт вложенные воркеры, которые нельзя спавнить из нашего module worker.
 */
export async function ocrPdf(
  file: File,
  lang: string = 'eng',
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const Tesseract: any = await import('tesseract.js');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await openPdfWithPdfjs(bytes.slice(0));

  onProgress?.(5);
  const worker = await Tesseract.createWorker(lang);
  const out = await PDFDocument.create();
  const invisibleFont = await out.embedFont(StandardFonts.Helvetica);

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress?.(5 + Math.round(((i - 1) / doc.numPages) * 85));
      const page = await doc.getPage(i);
      const baseVp = page.getViewport({ scale: 1 });
      const scale = ocrRenderScale(baseVp.width, baseVp.height);
      const vp = page.getViewport({ scale });

      const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
      await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas })
        .promise;

      const jpg = await canvasToBytes(canvas, 'image/jpeg', 0.85);
      // Отдаём байты JPEG: OffscreenCanvas tesseract может не принять,
      // а Uint8Array — универсальный вход для v5/v6.
      const recognizeResult = await worker.recognize(jpg);
      page.cleanup?.();

      const img = await out.embedJpg(jpg);
      const newPage = out.addPage([baseVp.width, baseVp.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: baseVp.width, height: baseVp.height });

      const words =
        recognizeResult?.data?.blocks?.flatMap?.(
          (block: any) =>
            block.paragraphs?.flatMap?.((para: any) =>
              para.lines?.flatMap?.((line: any) => line.words ?? []),
            ) ?? [],
        ) ?? [];

      words.forEach((word: any) => {
        const bbox = word?.bbox;
        const text = typeof word?.text === 'string' ? word.text.trim() : '';
        if (!bbox || !text) return;
        const x = bbox.x0 / scale;
        const w = (bbox.x1 - bbox.x0) / scale;
        const h = (bbox.y1 - bbox.y0) / scale;
        const y = baseVp.height - bbox.y1 / scale;
        if (w <= 0 || h <= 0) return;
        newPage.drawText(text, {
          x,
          y: y + h * 0.18,
          size: Math.max(4, h * 0.82),
          font: invisibleFont,
          color: rgb(0, 0, 0),
          opacity: 0,
        });
      });
    }
  } finally {
    try {
      await worker.terminate();
    } catch {
      // ignore
    }
  }

  onProgress?.(98);
  return out.save();
}

export function getAvailableVoices(): { name: string; lang: string }[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    return window.speechSynthesis.getVoices().map((voice) => ({
      name: voice.name,
      lang: voice.lang,
    }));
  } catch {
    return [];
  }
}

/**
 * Озвучивает текст PDF через Web Speech API. Это side-effect в браузере:
 * аудиофайл не создаётся (см. пояснение на странице инструмента).
 */
export async function pdfToAudio(
  file: File,
  options: { maxChars?: number; langHint?: string } = {},
): Promise<{ spokenChars: number; lang: string }> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    throw new Error('Speech synthesis is not supported in this browser.');
  }

  const maxChars = options.maxChars ?? 12000;
  const text = await pdfToText(file);
  const trimmed = text
    .replace(/--- Page \d+ ---/g, '')
    .trim()
    .slice(0, maxChars);
  if (!trimmed) {
    throw new Error('No extractable text found. If this is a scan, run OCR PDF first.');
  }

  const voiceLang = OCR_LANGUAGES[options.langHint ?? ''] ?? 'en-US';
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = voiceLang;
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);

  return { spokenChars: trimmed.length, lang: voiceLang };
}

/**
 * PDF → PPTX: каждая страница превращается в слайд с JPEG-снимком.
 * Работает в pdf-worker — у pptxgenjs нет зависимости от DOM.
 */
export async function pdfToPptx(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const mod: any = await import('pptxgenjs');
  const PptxGenJS = mod.default ?? mod;

  // 80% бюджета на рендер страниц, остальное — сборка презентации.
  const shots = await renderPageJpegs(file, 1.5, (p) => onProgress?.(Math.round(p * 0.8)));
  if (shots.length === 0) {
    throw new Error('No pages found in the PDF.');
  }

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slideW = 10; // inches
  const slideH = 5.625;

  for (const { jpg, widthPt, heightPt } of shots) {
    let wIn = slideW;
    let hIn = (slideW * heightPt) / widthPt;
    if (hIn > slideH) {
      hIn = slideH;
      wIn = (slideH * widthPt) / heightPt;
    }
    const slide = pptx.addSlide();
    slide.addImage({
      data: dataUrlFromBytes(jpg, 'image/jpeg'),
      x: (slideW - wIn) / 2,
      y: (slideH - hIn) / 2,
      w: wIn,
      h: hIn,
    });
  }

  onProgress?.(92);
  const out = await pptx.write({ outputType: 'arraybuffer' });
  return new Uint8Array(out as ArrayBuffer);
}
