import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PDF as SecurePDF } from "@libpdf/core";

let _unicodeFontBytes: ArrayBuffer | null = null;

async function loadUnicodeFont(): Promise<ArrayBuffer> {
  if (!_unicodeFontBytes) {
    const resp = await fetch("/fonts/NotoSans-Regular.ttf");
    if (!resp.ok) throw new Error("Could not load Unicode font.");
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
  return /[^\x00-\x7F]/.test(text);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image."));
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
      throw new Error("Image has invalid dimensions.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create image canvas.");
    ctx.drawImage(img, 0, 0, width, height);
    return dataUrlToBytes(canvas.toDataURL("image/png"));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

type PdfLayoutItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfLayoutLine = {
  text: string;
  items: PdfLayoutItem[];
};

type PdfLayoutPage = {
  pageNumber: number;
  lines: PdfLayoutLine[];
};

function toUint8Array(data: ArrayBuffer | Uint8Array | number[] | null | undefined): Uint8Array {
  if (!data) return new Uint8Array();
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data);
}

function bytesContainPdfHeader(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 1024);
  for (let i = 0; i <= limit - 5; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

export async function looksLikePdfFile(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  return bytesContainPdfHeader(head);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function createOwnerPassword(seed: string): string {
  const randomBytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const randomPart = Array.from(randomBytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${seed}::owner::${randomPart}`;
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;
  return pdfjs;
}

function lineTextFromItems(items: PdfLayoutItem[]): string {
  if (items.length === 0) return "";
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const parts: string[] = [];
  let prevEnd = sorted[0].x;

  for (const item of sorted) {
    const averageCharWidth = item.text.length > 0 ? item.width / item.text.length : 6;
    const gap = item.x - prevEnd;

    if (parts.length > 0) {
      if (gap > Math.max(22, averageCharWidth * 4)) {
        parts.push("\t");
      } else if (gap > Math.max(6, averageCharWidth * 1.2)) {
        parts.push(" ");
      }
    }

    parts.push(item.text);
    prevEnd = item.x + Math.max(item.width, averageCharWidth * item.text.length);
  }

  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\s+\t/g, "\t")
    .replace(/\t\s+/g, "\t")
    .trim();
}

function cellsFromLine(line: PdfLayoutLine): string[] {
  if (line.items.length === 0) return [line.text];
  const sorted = [...line.items].sort((a, b) => a.x - b.x);
  const cells: string[] = [];
  let current = sorted[0].text;
  let prevEnd = sorted[0].x + Math.max(sorted[0].width, sorted[0].text.length * 6);

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const prev = sorted[i - 1];
    const averageCharWidth = prev.text.length > 0 ? prev.width / prev.text.length : 6;
    const gap = item.x - prevEnd;

    if (gap > Math.max(20, averageCharWidth * 3.5)) {
      cells.push(current.trim());
      current = item.text;
    } else {
      current += gap > Math.max(5, averageCharWidth * 1.1) ? ` ${item.text}` : item.text;
    }

    prevEnd = item.x + Math.max(item.width, item.text.length * 6);
  }

  cells.push(current.trim());
  return cells.length > 0 ? cells : [line.text];
}

async function extractPdfLayout(file: File): Promise<PdfLayoutPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pages: PdfLayoutPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = (content.items || [])
      .map((item: any) => {
        const text = typeof item?.str === "string" ? item.str.trim() : "";
        if (!text) return null;
        const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
        return {
          text,
          x: Number(transform[4] || 0),
          y: Number(transform[5] || 0),
          width: Math.max(Number(item.width || 0), 1),
          height: Math.max(Math.abs(Number(item.height || transform[3] || 10)), 1),
        } satisfies PdfLayoutItem;
      })
      .filter((item): item is PdfLayoutItem => Boolean(item))
      .sort((a, b) => (Math.abs(a.y - b.y) <= 2 ? a.x - b.x : b.y - a.y));

    const rows: { y: number; items: PdfLayoutItem[] }[] = [];

    for (const item of items) {
      const threshold = Math.max(3, item.height * 0.45);
      const existingRow = rows.find((row) => Math.abs(row.y - item.y) <= threshold);
      if (existingRow) {
        existingRow.items.push(item);
        existingRow.y = (existingRow.y + item.y) / 2;
      } else {
        rows.push({ y: item.y, items: [item] });
      }
    }

    rows.sort((a, b) => b.y - a.y);
    const lines = rows
      .map((row) => {
        const sortedItems = [...row.items].sort((a, b) => a.x - b.x);
        return {
          text: lineTextFromItems(sortedItems),
          items: sortedItems,
        } satisfies PdfLayoutLine;
      })
      .filter((line) => line.text.length > 0);

    pages.push({ pageNumber, lines });
  }

  return pages;
}

async function mergePdfByteArrays(documents: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const bytes of documents) {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return mergedPdf.save();
}

function truncateToWidth(text: string, font: any, fontSize: number, maxWidth: number): string {
  if (!text) return "";
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text;

  const ellipsis = "…";
  let trimmed = text;
  while (trimmed.length > 0 && font.widthOfTextAtSize(`${trimmed}${ellipsis}`, fontSize) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed ? `${trimmed}${ellipsis}` : ellipsis;
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
  ranges: { start: number; end: number }[]
): Promise<Uint8Array[]> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const results: Uint8Array[] = [];
  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const pageIndices = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start - 1 + i
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
  pageIndices?: number[]
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
  const keepIndices = src
    .getPageIndices()
    .filter((i) => !pagesToDelete.includes(i));
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

export async function addWatermark(
  file: File,
  text: string,
  opacity: number = 0.3,
  rotation: number = 45,
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tile" = "center"
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
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const drawAt = (x: number, y: number) => {
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: degrees(position === "center" ? rotation : 0),
      });
    };
    if (position === "center") {
      drawAt(width / 2 - (text.length * fontSize) / 4, height / 2);
    } else if (position === "top-left") {
      drawAt(50, height - 60);
    } else if (position === "top-right") {
      drawAt(width - textWidth - 50, height - 60);
    } else if (position === "bottom-left") {
      drawAt(50, 50);
    } else if (position === "bottom-right") {
      drawAt(width - textWidth - 50, 50);
    } else if (position === "tile") {
      for (let y = 80; y < height; y += 150) {
        for (let x = 30; x < width; x += 180) {
          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity,
            rotate: degrees(rotation),
          });
        }
      }
    }
  });
  return pdf.save();
}

export async function addPageNumbers(
  file: File,
  position: "bottom-center" | "bottom-right" | "bottom-left" | "top-center" = "bottom-center",
  startFrom: number = 1,
  format: "number" | "x-of-y" = "number"
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const text = format === "x-of-y"
      ? `${i + startFrom} / ${pages.length + startFrom - 1}`
      : `${i + startFrom}`;
    const fontSize = 10;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x: number, y: number;
    switch (position) {
      case "bottom-center": x = width / 2 - textWidth / 2; y = 20; break;
      case "bottom-right": x = width - textWidth - 20; y = 20; break;
      case "bottom-left": x = 20; y = 20; break;
      case "top-center": x = width / 2 - textWidth / 2; y = height - 30; break;
    }
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
  });
  return pdf.save();
}

export async function compressPdf(
  file: File,
  level: "low" | "medium" | "high" = "medium"
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const firstPass = await pdf.save({ useObjectStreams: level !== "low" });

  if (level === "high") {
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
    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      image = await pdf.embedJpg(bytes);
    } else if (file.type === "image/png") {
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

  const rawLines = text.split("\n");
  const wrappedLines: string[] = [];
  for (const rawLine of rawLines) {
    if (rawLine.trim() === "") {
      wrappedLines.push("");
      continue;
    }
    const words = rawLine.split(" ");
    let current = "";
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
  footer: string
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const hasNonAscii = needsUnicode(header) || needsUnicode(footer);
  const font = hasNonAscii
    ? await embedUnicodeFont(pdf)
    : await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();
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
    throw new Error("The file is too damaged to repair. Please try another file.");
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

export async function protectPdf(file: File, password: string): Promise<Uint8Array> {
  const cleanPassword = password.trim();
  if (cleanPassword.length < 4) {
    throw new Error("Please enter a password with at least 4 characters.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await SecurePDF.load(bytes);
  pdf.setProtection({
    userPassword: cleanPassword,
    ownerPassword: createOwnerPassword(cleanPassword),
    algorithm: "AES-256",
  });
  return toUint8Array(await pdf.save());
}

export async function unlockPdf(file: File, password: string): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const credentials = password.trim();
  const pdf = await SecurePDF.load(bytes, credentials ? { credentials } : undefined);
  if (pdf.isEncrypted) {
    pdf.removeProtection();
    return toUint8Array(await pdf.save());
  }
  return bytes;
}

export async function signPdf(file: File, signatureText: string, color: [number, number, number] = [0.1, 0.2, 0.8]): Promise<Uint8Array> {
  if (!signatureText.trim()) throw new Error("Please enter your signature text.");
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = needsUnicode(signatureText)
    ? await embedUnicodeFont(pdf)
    : await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  const pages = pdf.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();
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
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(msg)), ms)
    ),
  ]);
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function collectMatchingTextItemIndexes(textItems: any[], searchText: string): Set<number> {
  const matches = new Set<number>();
  const normalizedSearch = normalizeSearchValue(searchText);
  if (!normalizedSearch) return matches;

  for (let i = 0; i < textItems.length; i++) {
    const raw = typeof textItems[i]?.str === "string" ? textItems[i].str : "";
    if (normalizeSearchValue(raw).includes(normalizedSearch)) {
      matches.add(i);
    }
  }
  if (matches.size > 0) return matches;

  const streamChars: string[] = [];
  const streamToItemIndex: number[] = [];
  let prevWasSpace = true;

  for (let i = 0; i < textItems.length; i++) {
    const raw = typeof textItems[i]?.str === "string" ? textItems[i].str : "";
    const normalized = raw.normalize("NFKC").toLowerCase();
    for (const ch of normalized) {
      const isSpace = /\s/.test(ch);
      if (isSpace) {
        if (!prevWasSpace) {
          streamChars.push(" ");
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

  const stream = streamChars.join("");
  let start = stream.indexOf(normalizedSearch);
  while (start !== -1) {
    const end = start + normalizedSearch.length;
    for (let idx = start; idx < end && idx < streamToItemIndex.length; idx++) {
      matches.add(streamToItemIndex[idx]);
    }
    start = stream.indexOf(normalizedSearch, start + 1);
  }

  return matches;
}

async function redactPdfLegacy(
  file: File,
  searchText: string,
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  if (!searchText.trim()) {
    throw new Error("Please enter the text you want to redact.");
  }

  const bytes = await file.arrayBuffer();
  const pdfJsBytes = bytes.slice(0);
  const pdfLibBytes = bytes.slice(0);
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;

  onProgress?.(10);

  const srcBytes = new Uint8Array(pdfJsBytes);
  const loadingTask = pdfjs.getDocument({ data: srcBytes });
  loadingTask.onProgress = (progressData: any) => {
    const loaded = typeof progressData?.loaded === "number" ? progressData.loaded : 0;
    const total = typeof progressData?.total === "number" ? progressData.total : 0;
    if (total > 0) {
      const loadPct = Math.min(20, 10 + Math.round((loaded / total) * 10));
      onProgress?.(loadPct);
    }
  };
  const pdfjsDoc = await withTimeout(
    loadingTask.promise,
    30_000,
    "PDF loading timed out. The file may be corrupted or too complex."
  );

  const pdfLib = await PDFDocument.load(pdfLibBytes, { ignoreEncryption: true });
  const resultPdf = await PDFDocument.create();
  const RENDER_SCALE = 1.5;

  onProgress?.(20);

  for (let pageIndex = 0; pageIndex < pdfjsDoc.numPages; pageIndex++) {
    const pageNumber = pageIndex + 1;
    const pagePct = 20 + Math.round((pageIndex / pdfjsDoc.numPages) * 70);
    onProgress?.(pagePct);
    const page = await pdfjsDoc.getPage(pageNumber);

    let textItems: any[] = [];
    try {
      const tc = await withTimeout(page.getTextContent(), 10_000, "");
      textItems = tc.items ?? [];
    } catch {
      throw new Error(
        `Unable to inspect page ${pageNumber} for the target text. ` +
        "Redaction was aborted to avoid generating an unsafe file."
      );
    }

    const matchingItemIndexes = collectMatchingTextItemIndexes(textItems, searchText);

    if (matchingItemIndexes.size === 0) {
      const [copied] = await resultPdf.copyPages(pdfLib, [pageIndex]);
      resultPdf.addPage(copied);
      continue;
    }

    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas rendering is not available in this browser.");
    }

    try {
      await withTimeout(
        page.render({ canvasContext: ctx, viewport, canvas }).promise,
        20_000,
        "Page rendering timed out"
      );
    } catch {
      // Render failed or timed out — draw black box over full page as fallback
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = "#000000";
    matchingItemIndexes.forEach((itemIndex) => {
      const it = textItems[itemIndex] as any;
      if (!it.transform) return;
      const [, , , , tx, ty] = it.transform;
      const pt = viewport.convertToViewportPoint(tx, ty);
      const itemHeight = Math.max(
        8,
        Math.abs((it.height || it.transform[3] || 0) * RENDER_SCALE)
      );
      const itemWidth = Math.max(8, (it.width || 0) * RENDER_SCALE);
      ctx.fillRect(
        Math.floor(pt[0]) - 2,
        Math.floor(pt[1]) - itemHeight - 2,
        Math.ceil(itemWidth) + 6,
        Math.ceil(itemHeight) + 6
      );
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1];
    const binaryStr = atob(base64);
    const imgBytes = new Uint8Array(binaryStr.length);
    for (let j = 0; j < binaryStr.length; j++) imgBytes[j] = binaryStr.charCodeAt(j);

    const img = await resultPdf.embedJpg(imgBytes);
    const origPage = pdfLib.getPage(pageIndex);
    const { width, height } = origPage.getSize();
    const newPage = resultPdf.addPage([width, height]);
    newPage.drawImage(img, { x: 0, y: 0, width, height });
  }

  onProgress?.(98);
  return resultPdf.save();
}

export async function redactPdf(
  file: File,
  searchText: string,
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  if (!searchText.trim()) {
    throw new Error("Please enter the text you want to redact.");
  }

  const bytes = await file.arrayBuffer();
  const pdfJsBytes = bytes.slice(0);
  const pdfLibBytes = bytes.slice(0);
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;

  onProgress?.(10);

  const srcBytes = new Uint8Array(pdfJsBytes);
  const loadingTask = pdfjs.getDocument({ data: srcBytes });
  loadingTask.onProgress = (progressData: any) => {
    const loaded = typeof progressData?.loaded === "number" ? progressData.loaded : 0;
    const total = typeof progressData?.total === "number" ? progressData.total : 0;
    if (total > 0) {
      const loadPct = Math.min(20, 10 + Math.round((loaded / total) * 10));
      onProgress?.(loadPct);
    }
  };
  const pdfjsDoc = await withTimeout(
    loadingTask.promise,
    30_000,
    "PDF loading timed out. The file may be corrupted or too complex."
  );

  const pdfLib = await PDFDocument.load(pdfLibBytes, { ignoreEncryption: true });
  const resultPdf = await PDFDocument.create();
  const renderScale = 1.5;

  onProgress?.(20);

  for (let pageIndex = 0; pageIndex < pdfjsDoc.numPages; pageIndex++) {
    const pageNumber = pageIndex + 1;
    const pagePct = 20 + Math.round((pageIndex / pdfjsDoc.numPages) * 70);
    onProgress?.(pagePct);

    const page = await pdfjsDoc.getPage(pageNumber);

    let textItems: any[] = [];
    try {
      const tc = await withTimeout(page.getTextContent(), 10_000, "");
      textItems = tc.items ?? [];
    } catch {
      throw new Error(
        `Unable to inspect page ${pageNumber} for the target text. ` +
        "Redaction was aborted to avoid generating an unsafe file."
      );
    }

    const matchingItemIndexes = collectMatchingTextItemIndexes(textItems, searchText);
    if (matchingItemIndexes.size === 0) {
      const [copied] = await resultPdf.copyPages(pdfLib, [pageIndex]);
      resultPdf.addPage(copied);
      continue;
    }

    const viewport = page.getViewport({ scale: renderScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas rendering is not available in this browser.");
    }

    try {
      await withTimeout(
        page.render({ canvasContext: ctx, viewport, canvas }).promise,
        20_000,
        "Page rendering timed out"
      );
    } catch (err: any) {
      throw new Error(
        `Unable to render page ${pageNumber} for redaction. ` +
        `${err?.message || "Redaction was aborted."}`
      );
    }

    ctx.fillStyle = "#000000";
    for (const itemIndex of Array.from(matchingItemIndexes)) {
      const item = textItems[itemIndex] as any;
      if (!item?.transform) {
        throw new Error(
          `Unable to determine text bounds on page ${pageNumber}. ` +
          "Redaction was aborted to avoid leaving visible text behind."
        );
      }

      const [, , , , tx, ty] = item.transform;
      const pt = viewport.convertToViewportPoint(tx, ty);
      const itemHeight = Math.max(
        8,
        Math.abs((item.height || item.transform[3] || 0) * renderScale)
      );
      const itemWidth = Math.max(8, (item.width || 0) * renderScale);
      ctx.fillRect(
        Math.floor(pt[0]) - 2,
        Math.floor(pt[1]) - itemHeight - 2,
        Math.ceil(itemWidth) + 6,
        Math.ceil(itemHeight) + 6
      );
    }

    const imgBytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.9));
    const img = await resultPdf.embedJpg(imgBytes);
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
  let text = "";
  try {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } catch {
    throw new Error("Failed to read the Word document. Please make sure it's a valid .docx file.");
  }
  if (!text.trim()) {
    throw new Error("The document appears to be empty or contains only images. Text conversion requires document text.");
  }
  return textToPdf(text);
}

export async function pdfToWord(file: File): Promise<Uint8Array> {
  const pages = await extractPdfLayout(file);
  const paragraphXml: string[] = [];

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    if (pageIndex > 0) {
      paragraphXml.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    }

    for (const line of page.lines) {
      paragraphXml.push(
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line.text)}</w:t></w:r></w:p>`
      );
    }
  }

  if (paragraphXml.length === 0) {
    throw new Error("No text was found in this PDF. Try OCR PDF for scanned documents.");
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const now = new Date().toISOString();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
  );

  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
  );

  zip.folder("docProps")?.file(
    "core.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(stripExtension(file.name))}</dc:title>
  <dc:creator>PDFX</dc:creator>
  <cp:lastModifiedBy>PDFX</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`
  );

  zip.folder("docProps")?.file(
    "app.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>PDFX</Application>
</Properties>`
  );

  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphXml.join("")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  zip.folder("word")?.folder("_rels")?.file(
    "document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function pdfToExcel(file: File): Promise<Uint8Array> {
  const pages = await extractPdfLayout(file);
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const page of pages) {
    const rows = page.lines.map((line) => {
      const cells = cellsFromLine(line);
      return cells.length > 1 ? cells : line.text.split("\t").filter(Boolean).length > 1 ? line.text.split("\t") : [line.text];
    });

    const sheet = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [[""]]);
    const columnCount = Math.max(...rows.map((row) => row.length), 1);
    sheet["!cols"] = Array.from({ length: columnCount }, (_, index) => {
      const maxLength = Math.max(
        10,
        ...rows.map((row) => String(row[index] ?? "").length)
      );
      return { wch: Math.min(maxLength + 2, 32) };
    });

    XLSX.utils.book_append_sheet(workbook, sheet, `Page ${page.pageNumber}`);
  }

  if (workbook.SheetNames.length === 0) {
    throw new Error("No text was found in this PDF. Try OCR PDF for scanned documents.");
  }

  const output = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    compression: true,
  });
  return toUint8Array(output);
}

export async function excelToPdf(file: File): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  const sheetData = workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: (XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as unknown[][]).map((row) => row.map((cell) => String(cell ?? ""))),
  }));

  const allText = sheetData
    .flatMap(({ sheetName, rows }) => [sheetName, ...rows.flatMap((row) => row)])
    .join(" ");

  const pdf = await PDFDocument.create();
  const baseFont = needsUnicode(allText)
    ? await embedUnicodeFont(pdf)
    : await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = needsUnicode(allText)
    ? baseFont
    : await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const titleSize = 16;
  const cellFontSize = 8.5;
  const rowHeight = 22;

  for (const sheet of sheetData) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [[""]];
    const columnCount = Math.max(...rows.map((row) => row.length), 1);
    const weights = Array.from({ length: columnCount }, (_, colIndex) =>
      Math.max(
        8,
        Math.min(
          24,
          ...rows.map((row) => String(row[colIndex] ?? "").length || 0)
        )
      )
    );
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || columnCount;
    const availableWidth = pageWidth - margin * 2;
    const columnWidths = weights.map((weight) => (availableWidth * weight) / totalWeight);

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawSheetHeader = (currentPage: typeof page, offsetY: number) => {
      currentPage.drawText(sheet.sheetName, {
        x: margin,
        y: offsetY - titleSize,
        size: titleSize,
        font: titleFont,
        color: rgb(0.08, 0.12, 0.2),
      });
      return offsetY - 34;
    };

    y = drawSheetHeader(page, y);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      if (y - rowHeight < margin) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = drawSheetHeader(page, pageHeight - margin);
      }

      let x = margin;
      const row = rows[rowIndex];
      const isHeaderRow = rowIndex === 0;

      for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        const cellWidth = columnWidths[colIndex];
        const rawCell = String(row[colIndex] ?? "");
        const cellText = truncateToWidth(rawCell, baseFont, cellFontSize, cellWidth - 8);

        page.drawRectangle({
          x,
          y: y - rowHeight,
          width: cellWidth,
          height: rowHeight,
          color: isHeaderRow ? rgb(0.9, 0.95, 1) : rgb(0.98, 0.99, 1),
          borderColor: rgb(0.8, 0.86, 0.94),
          borderWidth: 0.6,
        });

        page.drawText(cellText, {
          x: x + 4,
          y: y - rowHeight + 7,
          size: cellFontSize,
          font: baseFont,
          color: rgb(0.12, 0.16, 0.24),
        });

        x += cellWidth;
      }

      y -= rowHeight;
    }
  }

  return pdf.save();
}

export async function pdfToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str || "")
      .join(" ");
    textParts.push(`--- Page ${i} ---\n${pageText}`);
  }
  return textParts.join("\n\n");
}

export async function pdfToImages(
  file: File,
  format: "jpg" | "png" = "jpg",
  scale: number = 2
): Promise<{ dataUrl: string; page: number }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const results: { dataUrl: string; page: number }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
    const dataUrl = canvas.toDataURL(mimeType, 0.92);
    results.push({ dataUrl, page: i });
  }
  return results;
}

export async function pdfToHtml(file: File): Promise<string> {
  const text = await pdfToText(file);
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${file.name.replace(/\.[^.]+$/, "")}</title>
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
  format: "jpg" | "png",
  baseName: string
): Promise<Uint8Array> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const { dataUrl, page } of images) {
    const base64 = dataUrl.split(",")[1];
    zip.file(`${baseName}-page-${page}.${format}`, base64, { base64: true });
  }
  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  return zipBytes;
}

export function downloadBlob(bytes: Uint8Array, filename: string, mimeType = "application/pdf") {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function parsePageSelection(
  selection: string,
  pageCount: number,
  options?: { allowDuplicates?: boolean }
): number[] {
  const allowDuplicates = options?.allowDuplicates ?? false;
  const trimmed = selection.trim();
  if (!trimmed) {
    throw new Error("Please specify at least one page.");
  }

  const tokens = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  const result: number[] = [];
  const seen = new Set<number>();

  const pushPage = (pageNumber1Based: number) => {
    if (!Number.isInteger(pageNumber1Based) || pageNumber1Based < 1 || pageNumber1Based > pageCount) {
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
    throw new Error("No valid pages were selected.");
  }
  return result;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

// ─── Split improvements ───────────────────────────────────────────────────────

export async function splitPdfEveryN(file: File, n: number): Promise<Uint8Array[]> {
  if (!Number.isInteger(n) || n < 1) throw new Error("N must be a positive integer.");
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const results: Uint8Array[] = [];
  for (let start = 0; start < total; start += n) {
    const end = Math.min(start + n, total);
    const part = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await part.copyPages(src, indices);
    copied.forEach(p => part.addPage(p));
    results.push(await part.save());
  }
  return results;
}

export async function splitPdfAllPages(file: File): Promise<Uint8Array[]> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const results: Uint8Array[] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const part = await PDFDocument.create();
    const [copied] = await part.copyPages(src, [i]);
    part.addPage(copied);
    results.push(await part.save());
  }
  return results;
}

export async function splitResultsToZip(
  parts: Uint8Array[],
  baseName: string
): Promise<Uint8Array> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const padLen = String(parts.length).length;
  parts.forEach((bytes, i) => {
    const num = String(i + 1).padStart(padLen, "0");
    zip.file(`${baseName}-part${num}.pdf`, bytes);
  });
  return zip.generateAsync({ type: "uint8array" });
}

// ─── PDF → DOCX ───────────────────────────────────────────────────────────────

export async function pdfToDocx(file: File): Promise<Uint8Array> {
  const raw = await pdfToText(file);
  const text = raw.replace(/--- Page \d+ ---\n?/g, "");
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const paras = text
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(block => {
      const runs = block
        .split("\n")
        .map(line => `<w:r><w:t xml:space="preserve">${esc(line)}</w:t></w:r>`)
        .join("<w:r><w:br/></w:r>");
      return `<w:p>${runs}</w:p>`;
    })
    .join("\n    ") || "<w:p><w:r><w:t/></w:r></w:p>";

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paras}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );

  return zip.generateAsync({ type: "uint8array" });
}

// ─── OCR PDF ──────────────────────────────────────────────────────────────────

export async function ocrPdf(
  file: File,
  lang = "eng+rus",
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;

  onProgress?.(5);

  const pdfjsDoc = await withTimeout(
    pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise,
    30_000,
    "PDF loading timed out."
  );
  const pdfLib = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });

  onProgress?.(15);

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang, 1, { logger: () => {} });

  onProgress?.(25);

  const resultPdf = await PDFDocument.create();
  const scale = 2;
  const stdFont = await resultPdf.embedFont(StandardFonts.Helvetica);
  let unicodeFontPromise: Promise<any> | null = null;
  const getWordFont = async (text: string) => {
    if (!needsUnicode(text)) return stdFont;
    unicodeFontPromise ??= embedUnicodeFont(resultPdf);
    return unicodeFontPromise;
  };

  try {
    for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
      onProgress?.(25 + Math.round(((pageNum - 1) / pdfjsDoc.numPages) * 70));

      const page = await pdfjsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable.");
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      const { data } = await (worker.recognize(canvas) as Promise<any>);

      const [copied] = await resultPdf.copyPages(pdfLib, [pageNum - 1]);
      const newPage = resultPdf.addPage(copied);
      const { height: pdfH } = newPage.getSize();

      for (const word of (data as any).words) {
        if (!word.text.trim() || word.confidence < 30) continue;
        const { x0, y0, y1 } = word.bbox;
        const wordH = (y1 - y0) / scale;
        const pdfX = x0 / scale;
        const pdfY = pdfH - y1 / scale;
        const fontSize = Math.max(4, wordH * 0.85);
        try {
          newPage.drawText(word.text, {
            x: pdfX,
            y: pdfY,
            size: fontSize,
            font: await getWordFont(word.text),
            opacity: 0,
            color: rgb(0, 0, 0),
          });
        } catch {
          // Skip only words that still cannot be encoded by the chosen font.
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  onProgress?.(98);
  return resultPdf.save();
}

async function ocrPdfLegacy(
  file: File,
  lang = "eng+rus",
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;

  onProgress?.(5);

  const pdfjsDoc = await withTimeout(
    pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise,
    30_000,
    "PDF loading timed out."
  );
  const pdfLib = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });

  onProgress?.(15);

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang, 1, { logger: () => {} });

  onProgress?.(25);

  const resultPdf = await PDFDocument.create();
  const SCALE = 2;

  for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
    onProgress?.(25 + Math.round(((pageNum - 1) / pdfjsDoc.numPages) * 70));

    const page = await pdfjsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const { data } = await (worker.recognize(canvas) as Promise<any>);

    const [copied] = await resultPdf.copyPages(pdfLib, [pageNum - 1]);
    const newPage = resultPdf.addPage(copied);
    const { height: pdfH } = newPage.getSize();

    const stdFont = await resultPdf.embedFont(StandardFonts.Helvetica);

    for (const word of (data as any).words) {
      if (!word.text.trim() || word.confidence < 30) continue;
      const { x0, y0, y1 } = word.bbox;
      const wordH = (y1 - y0) / SCALE;
      const pdfX = x0 / SCALE;
      const pdfY = pdfH - y1 / SCALE;
      const fontSize = Math.max(4, wordH * 0.85);
      try {
        newPage.drawText(word.text, {
          x: pdfX,
          y: pdfY,
          size: fontSize,
          font: stdFont,
          opacity: 0,
          color: rgb(0, 0, 0),
        });
      } catch {
        // skip words with characters the font cannot encode
      }
    }
  }

  await worker.terminate();
  onProgress?.(98);
  return resultPdf.save();
}
