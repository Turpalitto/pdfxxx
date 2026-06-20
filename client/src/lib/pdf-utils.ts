import { PDFDocument, rgb, StandardFonts, degrees, BlendMode, PDFName, PDFRawStream, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PDF as SecurePDF } from "@libpdf/core";

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

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

// NotoSans (наш Unicode-фолбэк) не содержит emoji-глифов — drawText на них
// падает с ошибкой кодирования и роняет всю операцию. Удаляем только сами
// эмодзи/региональные индикаторы/variation selector/ZWJ; кириллицу, стрелки,
// галочки и пр. символы, которые Noto поддерживает, оставляем нетронутыми.
function sanitizeForFont(text: string): string {
  // Surrogate-pair ranges покрывают весь supplementary plane (эмодзи 1F000+,
  // флаги 1F1E6+); FE0F (variation selector) и 200D (ZWJ) — BMP. Через суррогаты,
  // а не \u{} — чтобы не требовать target es6+ в tsconfig.
  return text.replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[️‍]/g, "");
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ============================================================
// CANVAS ABSTRACTION — работает и в main thread, и в Web Worker
// В worker нет document → используем OffscreenCanvas. На main thread
// поведение сохраняется 1:1 (HTMLCanvasElement + toDataURL).
// Это позволяет переносить тяжёлые pdfjs-функции в worker без дублирования.
// ============================================================
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type AnyCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createRenderCanvas(width: number, height: number): { canvas: AnyCanvas; ctx: AnyCtx } {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  // В worker document отсутствует — рендерим в OffscreenCanvas.
  if (typeof document === "undefined" && typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context (OffscreenCanvas).");
    return { canvas, ctx };
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context.");
  return { canvas, ctx };
}

async function canvasToJpegBytes(canvas: AnyCanvas, quality = 0.92): Promise<Uint8Array> {
  // OffscreenCanvas не имеет toDataURL — только convertToBlob.
  if (typeof (canvas as OffscreenCanvas).convertToBlob === "function") {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
    return new Uint8Array(await blob.arrayBuffer());
  }
  return dataUrlToBytes((canvas as HTMLCanvasElement).toDataURL("image/jpeg", quality));
}

async function canvasToDataUrl(canvas: AnyCanvas, mime: string, quality = 0.92): Promise<string> {
  if (typeof (canvas as OffscreenCanvas).convertToBlob === "function") {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: mime, quality });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      // Array.from(ArrayLike) — без итерации типизированного массива (target < es2015)
      bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)) as number[]);
    }
    return `data:${mime};base64,${btoa(bin)}`;
  }
  return (canvas as HTMLCanvasElement).toDataURL(mime, quality);
}

function releaseCanvas(canvas: AnyCanvas) {
  // Освобождение памяти холста между итерациями (одинаково для обоих типов).
  canvas.width = 0;
  canvas.height = 0;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image."));
    img.src = src;
  });
}

// Растеризует изображение с применением EXIF Orientation → JPEG.
// createImageBitmap({imageOrientation:"from-image"}) поворачивает фото
// согласно EXIF; без этого снимки с телефона (Orientation 6/8) попадают
// в PDF повёрнутыми на 90°. Фолбэк без EXIF — через <img> на старых браузерах.
async function rasterizeOrientedToJpegBytes(
  file: File
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = null;
  }
  const canvas = document.createElement("canvas");
  try {
    let width: number, height: number;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create image canvas.");
    if (bitmap) {
      width = bitmap.width;
      height = bitmap.height;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(bitmap, 0, 0);
    } else {
      const objectUrl = URL.createObjectURL(file);
      try {
        const img = await loadImageElement(objectUrl);
        width = img.naturalWidth || img.width;
        height = img.naturalHeight || img.height;
        if (!width || !height) throw new Error("Image has invalid dimensions.");
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
    const bytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92));
    return { bytes, width, height };
  } finally {
    bitmap?.close();
    canvas.width = 0;
    canvas.height = 0;
  }
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

export type PdfTextAlignment = "left" | "center" | "right";

type PdfLayoutItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Glyph size in points, derived from the text transform. */
  fontSize: number;
  bold: boolean;
  italic: boolean;
  /** Fill color as hex string (e.g. "FF0000"), absent means default (black). */
  color?: string;
  /** CSS font-family from pdfjs style map, used for Word w:rFonts. */
  fontFamily?: string;
};

type PdfLayoutLine = {
  text: string;
  items: PdfLayoutItem[];
  /** Dominant (largest) font size on the line, in points. */
  fontSize: number;
  /** True when most of the line's characters are bold. */
  bold: boolean;
  alignment: PdfTextAlignment;
};

type PdfLayoutPage = {
  pageNumber: number;
  /** Page width/height in points (scale-1 viewport) — used for alignment. */
  width: number;
  height: number;
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

// Cell texts only (column-x is tracked by cellsWithX, which holds the shared
// gap heuristic). Kept for any text-only caller; delegates to avoid duplication.
function cellsFromLine(line: PdfLayoutLine): string[] {
  const cells = cellsWithX(line).map((cell) => cell.text);
  return cells.length > 0 ? cells : [line.text];
}

/**
 * Best-effort bold/italic detection from a font name/family string.
 * pdfjs `getTextContent` does not expose weight directly, but embedded font
 * names frequently carry it (e.g. "Arial-BoldMT", "TimesNewRoman-Italic").
 */
export function detectFontStyle(fontName: string | undefined): { bold: boolean; italic: boolean } {
  const n = (fontName || "").toLowerCase();
  const bold = /bold|black|heavy|semibold|demibold|extrabold|[^0-9](700|800|900)([^0-9]|$)/.test(n);
  const italic = /italic|oblique/.test(n);
  return { bold, italic };
}

/**
 * Infer paragraph alignment from a line's horizontal bounding box relative to
 * the page width. Margins are measured in points.
 */
export function lineAlignment(left: number, right: number, pageWidth: number): PdfTextAlignment {
  if (pageWidth <= 0) return "left";
  const leftMargin = left;
  const rightMargin = pageWidth - right;
  if (leftMargin < 0 || rightMargin < 0) return "left";
  const tol = pageWidth * 0.06;
  // Centered: comparable margins on both sides, and clearly indented from left.
  if (Math.abs(leftMargin - rightMargin) <= tol && leftMargin > pageWidth * 0.12) {
    return "center";
  }
  // Right-aligned: tiny right margin, large left margin.
  if (rightMargin + tol < leftMargin && leftMargin > pageWidth * 0.3) {
    return "right";
  }
  return "left";
}

/**
 * Cluster a flat list of x positions (cell starts gathered across all rows on a
 * page) into representative column anchors. Positions within `tolerance` points
 * collapse into one column.
 */
export function clusterColumns(starts: number[], tolerance: number): number[] {
  if (starts.length === 0) return [];
  const sorted = [...starts].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const current = clusters[clusters.length - 1];
    if (sorted[i] - current[current.length - 1] <= tolerance) {
      current.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }
  return clusters.map((cluster) => cluster.reduce((sum, v) => sum + v, 0) / cluster.length);
}

export type TableRegion = { start: number; end: number; columns: number[] };

/**
 * Conservatively detect table regions in a page's lines. A region is a run of
 * ≥2 *consecutive* lines that each split into ≥2 cells and share ≥2 clustered
 * columns. A non-tabular line (one cell) breaks the run. Pure & testable: only
 * reads each cell's `x` and the per-line cell count.
 */
export function detectTableRegions(
  cellsPerLine: ReadonlyArray<ReadonlyArray<{ x: number }>>,
  tolerance: number,
): TableRegion[] {
  const regions: TableRegion[] = [];
  let i = 0;
  while (i < cellsPerLine.length) {
    if (cellsPerLine[i].length < 2) {
      i++;
      continue;
    }
    let j = i;
    while (j < cellsPerLine.length && cellsPerLine[j].length >= 2) j++;
    const start = i;
    const end = j - 1;
    if (end - start + 1 >= 2) {
      const allX: number[] = [];
      for (let k = start; k <= end; k++) {
        for (const cell of cellsPerLine[k]) allX.push(cell.x);
      }
      const columns = clusterColumns(allX, tolerance);
      if (columns.length >= 2) {
        regions.push({ start, end, columns });
      }
    }
    i = j;
  }
  return regions;
}

/** Index of the nearest column anchor to `x`. */
export function assignToColumn(x: number, columns: number[]): number {
  if (columns.length === 0) return 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < columns.length; i++) {
    const dist = Math.abs(columns[i] - x);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

type LineCell = { text: string; x: number; color?: string };

/** Like cellsFromLine but keeps each cell's starting x (for column clustering). */
function cellsWithX(line: PdfLayoutLine): LineCell[] {
  if (line.items.length === 0) return [{ text: line.text, x: 0 }];
  const sorted = [...line.items].sort((a, b) => a.x - b.x);
  const cells: LineCell[] = [];
  let currentText = sorted[0].text;
  let currentX = sorted[0].x;
  let currentColors: string[] = sorted[0].color ? [sorted[0].color] : [];
  let prevEnd = sorted[0].x + Math.max(sorted[0].width, sorted[0].text.length * 6);

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const prev = sorted[i - 1];
    const averageCharWidth = prev.text.length > 0 ? prev.width / prev.text.length : 6;
    const gap = item.x - prevEnd;

    if (gap > Math.max(20, averageCharWidth * 3.5)) {
      const dominantColor = dominantString(currentColors);
      cells.push({ text: currentText.trim(), x: currentX, ...(dominantColor ? { color: dominantColor } : {}) });
      currentText = item.text;
      currentX = item.x;
      currentColors = item.color ? [item.color] : [];
    } else {
      currentText += gap > Math.max(5, averageCharWidth * 1.1) ? ` ${item.text}` : item.text;
      if (item.color) currentColors.push(item.color);
    }
    prevEnd = item.x + Math.max(item.width, item.text.length * 6);
  }

  const dominantColor = dominantString(currentColors);
  cells.push({ text: currentText.trim(), x: currentX, ...(dominantColor ? { color: dominantColor } : {}) });
  return cells;
}

export function dominantString(arr: string[]): string | undefined {
  if (arr.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const s of arr) counts.set(s, (counts.get(s) || 0) + 1);
  let best = arr[0];
  let bestCount = 0;
  counts.forEach((c, s) => {
    if (c > bestCount) { best = s; bestCount = c; }
  });
  return best;
}

export type StyledRun = { text: string; bold: boolean; italic: boolean; fontSizePt: number; color?: string; fontFamily?: string };

/**
 * Group a line's items into styled runs (consecutive items sharing
 * bold/italic/size merge), inserting spacing that mirrors the x-gaps so
 * separated columns stay visually apart in flow layout.
 */
function itemsToStyledRuns(line: PdfLayoutLine): StyledRun[] {
  const sorted = [...line.items].sort((a, b) => a.x - b.x);
  if (sorted.length === 0) {
    return line.text ? [{ text: line.text, bold: line.bold, italic: false, fontSizePt: Math.round(line.fontSize) || 11 }] : [];
  }

  const runs: StyledRun[] = [];
  let prevEnd = sorted[0].x;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const averageCharWidth = item.text.length > 0 ? item.width / item.text.length : 6;
    const gap = item.x - prevEnd;

    let sep = "";
    if (i > 0) {
      if (gap > Math.max(22, averageCharWidth * 4)) sep = "   ";
      else if (gap > Math.max(6, averageCharWidth * 1.2)) sep = " ";
    }

    const fontSizePt = Math.max(1, Math.round(item.fontSize)) || 11;
    const last = runs[runs.length - 1];
    if (last && last.bold === item.bold && last.italic === item.italic && last.fontSizePt === fontSizePt && last.color === item.color && last.fontFamily === item.fontFamily) {
      last.text += sep + item.text;
    } else {
      if (last && sep) last.text += sep;
      runs.push({ text: item.text, bold: item.bold, italic: item.italic, fontSizePt, ...(item.color ? { color: item.color } : {}), ...(item.fontFamily ? { fontFamily: item.fontFamily } : {}) });
    }

    prevEnd = item.x + Math.max(item.width, averageCharWidth * item.text.length);
  }

  return runs;
}

function toHex2(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
}

export function fillColorToHex(colorSpace: string, components: number[]): string | undefined {
  if (!components || components.length === 0) return undefined;
  const eps = 0.02;
  switch (colorSpace) {
    case "rgb": {
      const [r, g, b] = components;
      if (Math.abs(r) < eps && Math.abs(g) < eps && Math.abs(b) < eps) return undefined;
      return toHex2(r * 255) + toHex2(g * 255) + toHex2(b * 255);
    }
    case "gray": {
      const v = components[0];
      if (Math.abs(v) < eps) return undefined;
      if (Math.abs(v - 1) < eps) return undefined;
      return toHex2(v * 255) + toHex2(v * 255) + toHex2(v * 255);
    }
    case "cmyk": {
      const [c, m, y, k] = components;
      const r = (1 - c) * (1 - k);
      const g = (1 - m) * (1 - k);
      const b = (1 - y) * (1 - k);
      if (r < eps && g < eps && b < eps) return undefined;
      return toHex2(r * 255) + toHex2(g * 255) + toHex2(b * 255);
    }
    default:
      return undefined;
  }
}

async function extractPageColors(
  page: any,
  items: any[],
): Promise<Map<number, string | undefined>> {
  const pdfjs = await loadPdfJs();
  let opList: any;
  try {
    opList = await page.getOperatorList();
  } catch {
    return new Map();
  }
  const OPS = pdfjs.OPS;
  const colorOps = new Map([
    [OPS.setFillRGBColor, "rgb"],
    [OPS.setFillGray, "gray"],
    [OPS.setFillCMYKColor, "cmyk"],
  ]);
  const textOps = new Set([
    OPS.showText,
    OPS.showSpacedText,
    OPS.nextLineShowText,
    OPS.nextLineSetSpacingShowText,
  ]);
  const colorMap = new Map<number, string | undefined>();
  let currentColor: string | undefined = undefined;
  let currentColorSpace = "";
  let currentComponents: number[] = [];
  let textIdx = 0;

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (colorOps.has(fn)) {
      currentColorSpace = colorOps.get(fn)!;
      currentComponents = Array.isArray(args) ? args.map(Number) : [];
      currentColor = fillColorToHex(currentColorSpace, currentComponents);
    } else if (textOps.has(fn)) {
      if (textIdx < items.length) {
        colorMap.set(textIdx, currentColor);
      }
      textIdx++;
    }
  }
  return colorMap;
}

async function renderPageToPng(pdfPage: any): Promise<Uint8Array | null> {
  try {
    const scale = 2;
    const viewport = pdfPage.getViewport({ scale });
    const { canvas, ctx } = createRenderCanvas(viewport.width, viewport.height);
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    let dataUrl: string;
    if (typeof (canvas as OffscreenCanvas).convertToBlob === "function") {
      const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: "image/png" });
      const buf = new Uint8Array(await blob.arrayBuffer());
      releaseCanvas(canvas);
      return buf;
    } else {
      dataUrl = (canvas as HTMLCanvasElement).toDataURL("image/png");
      releaseCanvas(canvas);
      return dataUrlToBytes(dataUrl);
    }
  } catch {
    return null;
  }
}

/** Median of a numeric list (used to estimate the document's body font size). */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function extractPdfLayout(file: File): Promise<PdfLayoutPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pages: PdfLayoutPage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const pageWidth = Math.max(Number(viewport.width) || 0, 1);
    const pageHeight = Math.max(Number(viewport.height) || 0, 1);
    const content = await page.getTextContent();
    const rawItems: any[] = content.items || [];
    const styles: Record<string, any> = (content as any).styles || {};

    const colorMap = await extractPageColors(page, rawItems);

    const items = rawItems
      .map((item: any, rawIdx: number) => {
        const text = typeof item?.str === "string" ? item.str.trim() : "";
        if (!text) return null;
        const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
        const fontName = typeof item.fontName === "string" ? item.fontName : "";
        const fontFamily =
          typeof styles[fontName]?.fontFamily === "string" ? styles[fontName].fontFamily : "";
        const { bold, italic } = detectFontStyle(`${fontName} ${fontFamily}`);
        const transformSize = Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 0);
        const fontSize = Math.max(
          1,
          transformSize || Math.abs(Number(item.height) || Number(transform[3]) || 10),
        );
        const color = colorMap.get(rawIdx);
        return {
          text,
          x: Number(transform[4] || 0),
          y: Number(transform[5] || 0),
          width: Math.max(Number(item.width || 0), 1),
          height: Math.max(Math.abs(Number(item.height || transform[3] || 10)), 1),
          fontSize,
          bold,
          italic,
          ...(color ? { color } : {}),
          ...(fontFamily ? { fontFamily } : {}),
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
        const left = Math.min(...sortedItems.map((i) => i.x));
        const right = Math.max(...sortedItems.map((i) => i.x + i.width));
        const fontSize = Math.max(...sortedItems.map((i) => i.fontSize));
        const totalChars = sortedItems.reduce((sum, i) => sum + i.text.length, 0);
        const boldChars = sortedItems
          .filter((i) => i.bold)
          .reduce((sum, i) => sum + i.text.length, 0);
        return {
          text: lineTextFromItems(sortedItems),
          items: sortedItems,
          fontSize,
          bold: totalChars > 0 && boldChars / totalChars > 0.6,
          alignment: lineAlignment(left, right, pageWidth),
        } satisfies PdfLayoutLine;
      })
      .filter((line) => line.text.length > 0);

    pages.push({ pageNumber, width: pageWidth, height: pageHeight, lines });
  }
  } finally {
    // pdfToWord/Excel/Text/Html/Markdown all route through here — release the
    // pdfjs document and its worker port so repeated conversions don't leak.
    await loadingTask.destroy();
  }

  return pages;
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
  if (!files || files.length === 0) {
    throw new Error("No files to merge. Please add at least one PDF.");
  }
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  if (mergedPdf.getPageCount() === 0) {
    throw new Error("The selected files contain no pages.");
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
    if (pageIndices.length === 0) continue;
    const copiedPages = await newPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    results.push(await newPdf.save());
  }
  if (results.length === 0) {
    throw new Error("The selected page range is outside the document. Check the page numbers.");
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
  const count = pdf.getPageCount();
  const indices = (pageIndices ?? pdf.getPageIndices()).filter(
    (i) => i >= 0 && i < count
  );
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
  if (keepIndices.length === 0) {
    throw new Error("Cannot delete all pages — at least one page must remain.");
  }
  const copiedPages = await newPdf.copyPages(src, keepIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
}

export async function extractPages(file: File, pageIndices: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const count = src.getPageCount();
  const valid = pageIndices.filter((i) => i >= 0 && i < count);
  if (valid.length === 0) {
    throw new Error("No valid pages selected to extract.");
  }
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(src, valid);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
}

export async function reorderPages(file: File, newOrder: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const count = src.getPageCount();
  const valid = newOrder.filter((i) => i >= 0 && i < count);
  if (valid.length === 0) {
    throw new Error("No valid page order provided.");
  }
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(src, valid);
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
  text = sanitizeForFont(text);
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
      drawAt(width / 2 - textWidth / 2, height / 2);
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

export async function batesNumbering(
  file: File,
  options: {
    prefix?: string;
    startNumber?: number;
    digits?: number;
    suffix?: string;
    position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
    fontSize?: number;
    margin?: number;
    color?: [number, number, number];
    opacity?: number;
  } = {},
): Promise<Uint8Array> {
  const {
    prefix = "",
    startNumber = 1,
    digits = 6,
    suffix = "",
    position = "bottom-right",
    fontSize = 10,
    margin = 36,
    color = [0, 0, 0],
    opacity = 1,
  } = options;

  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  pages.forEach((page, index) => {
    const batesNum = String(startNumber + index).padStart(digits, "0");
    const label = `${prefix}${batesNum}${suffix}`;
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    let x: number;
    let y: number;
    switch (position) {
      case "top-left":
        x = margin;
        y = height - margin - textHeight;
        break;
      case "top-right":
        x = width - margin - textWidth;
        y = height - margin - textHeight;
        break;
      case "bottom-left":
        x = margin;
        y = margin;
        break;
      case "center":
        x = width / 2 - textWidth / 2;
        y = height / 2 - textHeight / 2;
        break;
      case "bottom-right":
      default:
        x = width - margin - textWidth;
        y = margin;
        break;
    }
    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color[0], color[1], color[2]),
      opacity,
    });
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

// ============================================================
// COMPRESS — реальное сжатие, а не только структурная оптимизация.
//   low / medium → Smart: пережать встроенные JPEG-картинки (DCTDecode),
//                  уменьшив разрешение и качество. Текст и вектор не трогаются.
//   high         → Rasterize: каждая страница рендерится в JPEG. Максимальное
//                  сжатие на любом PDF, но текст становится картинкой.
// Всё в браузере (canvas + pdfjs), без серверной обработки.
// ============================================================

const SMART_COMPRESS: Record<"low" | "medium", { maxDim: number; quality: number }> = {
  low: { maxDim: 2200, quality: 0.82 },
  medium: { maxDim: 1600, quality: 0.62 },
};

// Число цветовых компонентов JPEG из маркера SOF (1=gray, 3=RGB/YCbCr, 4=CMYK).
// Нужно чтобы пропускать CMYK — браузер декодирует Adobe-CMYK с инверсией цветов.
function jpegComponentCount(bytes: Uint8Array): number | null {
  let i = 2; // пропускаем SOI (FFD8)
  const n = bytes.length;
  while (i + 9 < n) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    // SOF-маркеры несут число компонентов (исключаем C4=DHT, C8=JPG, CC=DAC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return bytes[i + 9] ?? null;
    }
    // Маркеры без длины (SOI/EOI/RSTn) — шаг 2 байта.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

// Декодирует «сырой» поток DCTDecode (это готовый JPEG) в растровый bitmap.
async function decodeJpegBitmap(bytes: Uint8Array): Promise<ImageBitmap | null> {
  try {
    const blob = new Blob([bytes], { type: "image/jpeg" });
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

// Проходит по всем image-XObject'ам и пережимает одиночные JPEG (DCTDecode):
// даунсемпл до maxDim по длинной стороне + повторное кодирование с quality.
// Заменяет поток только если результат реально меньше. Возвращает кол-во замен.
async function recompressEmbeddedImages(
  doc: PDFDocument,
  maxDim: number,
  quality: number
): Promise<number> {
  const context = doc.context;
  let replaced = 0;
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    try {
      if (dict.get(PDFName.of("Subtype"))?.toString() !== "/Image") continue;

      // Только одиночный DCTDecode (готовый JPEG). Обёрнутые/JPX/CCITT пропускаем.
      if (dict.get(PDFName.of("Filter"))?.toString() !== "/DCTDecode") continue;

      // Маски/прозрачность/кастомный Decode — пропускаем, чтобы не ловить артефакты.
      if (
        dict.get(PDFName.of("SMask")) ||
        dict.get(PDFName.of("Mask")) ||
        dict.get(PDFName.of("ImageMask")) ||
        dict.get(PDFName.of("Decode"))
      )
        continue;

      const original = obj.contents;
      if (!original || original.length < 8 * 1024) continue; // мелочь не трогаем

      // CMYK (4 компонента) пропускаем — иначе риск инверсии цветов на печатных PDF.
      if (jpegComponentCount(original) === 4) continue;

      const bitmap = await decodeJpegBitmap(original);
      if (!bitmap) continue;
      try {
        const longSide = Math.max(bitmap.width, bitmap.height);
        const scale = longSide > maxDim ? maxDim / longSide : 1;
        const dstW = Math.max(1, Math.round(bitmap.width * scale));
        const dstH = Math.max(1, Math.round(bitmap.height * scale));

        const { canvas, ctx } = createRenderCanvas(dstW, dstH);
        (ctx as CanvasRenderingContext2D).drawImage(
          bitmap as unknown as CanvasImageSource,
          0,
          0,
          dstW,
          dstH
        );
        const newBytes = await canvasToJpegBytes(canvas, quality);
        releaseCanvas(canvas);

        if (newBytes.length >= original.length) continue; // не меньше — оставляем как было

        const newDict = context.obj({
          Type: "XObject",
          Subtype: "Image",
          Width: dstW,
          Height: dstH,
          ColorSpace: "DeviceRGB",
          BitsPerComponent: 8,
          Filter: "DCTDecode",
          Length: newBytes.length,
        });
        context.assign(ref, PDFRawStream.of(newDict, newBytes));
        replaced++;
      } finally {
        bitmap.close();
      }
    } catch {
      /* проблемную картинку пропускаем — остальные пережимаются */
    }
  }
  return replaced;
}

// Растеризует каждую страницу в JPEG и собирает новый PDF (по картинке на лист).
async function rasterizeToCompressedPdf(
  file: File,
  scale: number,
  quality: number
): Promise<Uint8Array> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const srcPdf = await loadingTask.promise;
  const outPdf = await PDFDocument.create();
  try {
    for (let i = 1; i <= srcPdf.numPages; i++) {
      const page = await srcPdf.getPage(i);
      const pointVp = page.getViewport({ scale: 1 }); // размер страницы в PDF-точках
      const base = page.getViewport({ scale });
      const maxArea = 25_000_000;
      const safeScale =
        base.width * base.height > maxArea
          ? scale * Math.sqrt(maxArea / (base.width * base.height))
          : scale;
      const vp = page.getViewport({ scale: safeScale });
      const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
      await page.render({
        canvasContext: ctx as CanvasRenderingContext2D,
        viewport: vp,
        canvas: canvas as HTMLCanvasElement,
      }).promise;
      const jpeg = await canvasToJpegBytes(canvas, quality);
      releaseCanvas(canvas);
      page.cleanup();

      const img = await outPdf.embedJpg(jpeg);
      const p = outPdf.addPage([pointVp.width, pointVp.height]);
      p.drawImage(img, { x: 0, y: 0, width: pointVp.width, height: pointVp.height });
    }
  } finally {
    await loadingTask.destroy();
  }
  return outPdf.save({ useObjectStreams: true });
}

export async function compressPdf(
  file: File,
  level: "low" | "medium" | "high" = "medium"
): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (level === "high") {
    // Растеризация даёт максимальное сжатие; при ошибке — структурный фолбэк.
    try {
      const raster = await rasterizeToCompressedPdf(file, 1.5, 0.6);
      if (raster.byteLength < bytes.byteLength) return raster;
    } catch {
      /* ниже — структурный фолбэк */
    }
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const saved = await pdf.save({ useObjectStreams: true });
    return saved.byteLength < bytes.byteLength ? saved : bytes;
  }

  // low / medium — умное пережатие картинок + структурная оптимизация.
  const settings = SMART_COMPRESS[level];
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  try {
    await recompressEmbeddedImages(pdf, settings.maxDim, settings.quality);
  } catch {
    /* даже если пережатие упало — сохраним со структурной оптимизацией */
  }
  const saved = await pdf.save({ useObjectStreams: true });
  return saved.byteLength < bytes.byteLength ? saved : bytes;
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    let image;
    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      // Через ориентированный растеризатор — учитывает EXIF Orientation.
      const oriented = await rasterizeOrientedToJpegBytes(file);
      image = await pdf.embedJpg(oriented.bytes);
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
  text = sanitizeForFont(text);
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
  header = sanitizeForFont(header);
  footer = sanitizeForFont(footer);
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
  // Реальный flatten: впекаем значения полей формы в статический контент.
  // copyPages в новый документ терял бы AcroForm вместе со значениями полей.
  try {
    const form = src.getForm();
    form.flatten();
  } catch {
    // Документ без формы — flatten не нужен, просто пересохраняем.
  }
  return src.save();
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
  if (pages.length === 0) throw new Error("The PDF has no pages to sign.");
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
    // Canvas-абстракция: OffscreenCanvas в воркере, HTMLCanvasElement в main.
    const { canvas, ctx } = createRenderCanvas(viewport.width, viewport.height);

    try {
      await withTimeout(
        page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport, canvas: canvas as HTMLCanvasElement }).promise,
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

      // Строим покрывающий прямоугольник по 4 углам текстового run в PDF-空间,
      // затем проецируем их на canvas через convertToViewportPoint. Это корректно
      // обрабатывает повёрнутые страницы и наклонный текст (для rotation=0 —
      // эквивалентно axis-aligned боксу). Над-покрытие безопасно для редакции.
      const [a, b, c, d, tx, ty] = item.transform;
      let bx = a, by = b;
      let blen = Math.hypot(bx, by);
      if (blen === 0) { bx = 1; by = 0; blen = 1; }
      const ubx = bx / blen, uby = by / blen; // направление базовой линии
      const runLen = Math.max(1, item.width || blen);
      let vx = c, vy = d;
      let vlen = Math.hypot(vx, vy);
      if (vlen === 0) { vx = -uby; vy = ubx; vlen = 1; }
      const uvx = vx / vlen, uvy = vy / vlen; // вертикальное направление глифа
      const fontH = Math.max(6, item.height || vlen);
      const ascent = fontH;
      const descent = fontH * 0.25;
      const cornersPdf: [number, number][] = [
        [tx - uvx * descent, ty - uvy * descent],
        [tx + ubx * runLen - uvx * descent, ty + uby * runLen - uvy * descent],
        [tx + ubx * runLen + uvx * ascent, ty + uby * runLen + uvy * ascent],
        [tx + uvx * ascent, ty + uvy * ascent],
      ];
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const [cx, cy] of cornersPdf) {
        const vpPt = viewport.convertToViewportPoint(cx, cy);
        if (vpPt[0] < bx0) bx0 = vpPt[0];
        if (vpPt[0] > bx1) bx1 = vpPt[0];
        if (vpPt[1] < by0) by0 = vpPt[1];
        if (vpPt[1] > by1) by1 = vpPt[1];
      }
      const pad = 2;
      ctx.fillRect(
        Math.floor(bx0) - pad,
        Math.floor(by0) - pad,
        Math.ceil(bx1 - bx0) + pad * 2,
        Math.ceil(by1 - by0) + pad * 2
      );
    }

    const imgBytes = await canvasToJpegBytes(canvas, 0.9);
    const img = await resultPdf.embedJpg(imgBytes);
    // Размер страницы берём из viewport (учитывает /Rotate), а НЕ из getSize()
    // (сырой MediaBox без rotation) — иначе ротированный растр вжимается в
    // неповёрнутую страницу, маски смещаются и текст остаётся видимым.
    const pageW = viewport.width / renderScale;
    const pageH = viewport.height / renderScale;
    const newPage = resultPdf.addPage([pageW, pageH]);
    newPage.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
    releaseCanvas(canvas);
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

/** Render one layout line as a styled WordprocessingML paragraph. */
function lineToParagraphXml(line: PdfLayoutLine, headingThreshold: number): string {
  const isHeading = line.fontSize >= headingThreshold;
  const runs = itemsToStyledRuns(line);
  const runXml = (runs.length > 0 ? runs : [{ text: line.text, bold: line.bold, italic: false, fontSizePt: Math.round(line.fontSize) || 11 }])
    .map((run) => {
      const bold = run.bold || line.bold || isHeading;
      const sizeHalfPoints = Math.max(2, Math.round(run.fontSizePt * 2));
      const colorXml = run.color ? `<w:color w:val="${run.color}"/>` : "";
      const rFontsXml = run.fontFamily ? `<w:rFonts w:ascii="${escapeXml(run.fontFamily)}" w:hAnsi="${escapeXml(run.fontFamily)}" w:cs="${escapeXml(run.fontFamily)}"/>` : "";
      const rPr =
        `<w:rPr>` +
        rFontsXml +
        (bold ? "<w:b/>" : "") +
        (run.italic ? "<w:i/>" : "") +
        colorXml +
        `<w:sz w:val="${sizeHalfPoints}"/><w:szCs w:val="${sizeHalfPoints}"/>` +
        `</w:rPr>`;
      return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
    })
    .join("");

  const jc =
    line.alignment === "center"
      ? '<w:jc w:val="center"/>'
      : line.alignment === "right"
        ? '<w:jc w:val="right"/>'
        : "";
  const spacingXml = isHeading ? '<w:spacing w:before="240" w:after="120"/>' : '<w:spacing w:after="120"/>';
  const pPr = (jc || spacingXml) ? `<w:pPr>${spacingXml}${jc}</w:pPr>` : "";
  return `<w:p>${pPr}${runXml}</w:p>`;
}

const TABLE_BORDERS =
  `<w:tblBorders>` +
  `<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
  `<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
  `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
  `<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
  `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
  `<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>` +
  `</w:tblBorders>`;

/** Render a detected table region as a bordered WordprocessingML table. */
function tableRegionToXml(region: TableRegion, cellsPerLine: LineCell[][]): string {
  const cols = region.columns;
  const gridCols = cols.map(() => "<w:gridCol/>").join("");
  const rowsXml: string[] = [];

  for (let k = region.start; k <= region.end; k++) {
    const rowCells: LineCell[] = Array.from({ length: cols.length }, () => ({ text: "", x: 0 }));
    for (const cell of cellsPerLine[k]) {
      const idx = assignToColumn(cell.x, cols);
      rowCells[idx] = rowCells[idx].text ? { text: `${rowCells[idx].text} ${cell.text}`.trim(), x: rowCells[idx].x, color: rowCells[idx].color || cell.color } : cell;
    }
    const tcs = rowCells
      .map(
        (cell) => {
          const colorXml = cell.color ? `<w:rPr><w:color w:val="${cell.color}"/></w:rPr>` : "";
          return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>` +
            `<w:p><w:r>${colorXml}<w:t xml:space="preserve">${escapeXml(cell.text)}</w:t></w:r></w:p></w:tc>`;
        },
      )
      .join("");
    rowsXml.push(`<w:tr>${tcs}</w:tr>`);
  }

  return (
    `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${TABLE_BORDERS}</w:tblPr>` +
    `<w:tblGrid>${gridCols}</w:tblGrid>${rowsXml.join("")}</w:tbl>`
  );
}

export async function pdfToWord(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await loadPdfJs();
  const renderLoadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const renderPdf = await renderLoadingTask.promise;
  const pages = await extractPdfLayout(new File([arrayBuffer], file.name, { type: file.type }));

  const bodyFontSize = median(
    pages.flatMap((page) => page.lines.map((line) => line.fontSize)).filter((s) => s > 0),
  ) || 11;
  const headingThreshold = bodyFontSize * 1.3;

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const paragraphXml: string[] = [];
  const imageRels: { id: string; target: string }[] = [];
  const imageBlobs: { rel: { id: string; target: string }; data: Uint8Array }[] = [];

  try {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      if (pageIndex > 0) {
        paragraphXml.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
      }

      const totalChars = page.lines.reduce((sum, l) => sum + l.text.length, 0);
      const textAreaEstimate = totalChars * (page.width / 70) * (page.height / 72 / page.lines.length || 1);
      const pageArea = page.width * page.height;
      const textDensity = pageArea > 0 ? textAreaEstimate / pageArea : 0;
      const isScanLike = page.lines.length < 3 || textDensity < 0.02;

      if (isScanLike) {
        const pdfPage = await renderPdf.getPage(pageIndex + 1);
        const imgData = await renderPageToPng(pdfPage);
        if (imgData) {
          const relId = `rImg${imageRels.length + 4}`;
          const target = `media/image${imageRels.length + 1}.png`;
          const vp = pdfPage.getViewport({ scale: 1 });
          const cxEmu = Math.round(vp.width * 914400 / 72);
          const cyEmu = Math.round(vp.height * 914400 / 72);
          paragraphXml.push(
            `<w:p><w:r><w:rPr><w:noProof/></w:rPr><w:drawing>` +
            `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
            `<wp:extent cx="${cxEmu}" cy="${cyEmu}"/>` +
            `<wp:docPr id="${imageRels.length + 1}" name="Page ${pageIndex + 1}"/>` +
            `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
            `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
            `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
            `<pic:nvPicPr><pic:cNvPr id="${imageRels.length + 1}" name="Page ${pageIndex + 1}"/><pic:cNvPicPr/></pic:nvPicPr>` +
            `<pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
            `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cxEmu}" cy="${cyEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
            `</pic:pic></a:graphicData></a:graphic>` +
            `</wp:inline></w:drawing></w:r></w:p>`,
          );
          imageRels.push({ id: relId, target });
          imageBlobs.push({ rel: { id: relId, target }, data: imgData });
          continue;
        }
      }

      const cellsPerLine = page.lines.map((line) => cellsWithX(line));
      const colTolerance = Math.max(
        14,
        (median(page.lines.map((line) => line.fontSize).filter((s) => s > 0)) || bodyFontSize) * 1.2,
      );
      const regions = detectTableRegions(cellsPerLine, colTolerance);
      const regionByStart = new Map(regions.map((region) => [region.start, region]));

      let lineIndex = 0;
      while (lineIndex < page.lines.length) {
        const region = regionByStart.get(lineIndex);
        if (region) {
          paragraphXml.push(tableRegionToXml(region, cellsPerLine));
          paragraphXml.push("<w:p/>");
          lineIndex = region.end + 1;
        } else {
          paragraphXml.push(lineToParagraphXml(page.lines[lineIndex], headingThreshold));
          lineIndex++;
        }
      }
    }
  } finally {
    await renderLoadingTask.destroy();
  }

  if (paragraphXml.length === 0) {
    throw new Error("No text was found in this PDF. Try OCR PDF for scanned documents.");
  }

  const now = new Date().toISOString();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
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

// Match page size to the first PDF page for best fidelity.
  const firstPage = pages[0];
  const pageWidthTwips = firstPage ? Math.round(firstPage.width * 1440 / 72) : 11906;
  const pageHeightTwips = firstPage ? Math.round(firstPage.height * 1440 / 72) : 16838;

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
  xmlns:wne="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphXml.join("")}
    <w:sectPr>
      <w:pgSz w:w="${pageWidthTwips}" w:h="${pageHeightTwips}"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  const imageRelsXml = imageRels
    .map((rel) => `<Relationship Id="${rel.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${rel.target}"/>`)
    .join("");

  zip.folder("word")?.folder("_rels")?.file(
    "document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageRelsXml}</Relationships>`
  );

  for (const blob of imageBlobs) {
    zip.folder("word")?.folder("media")?.file(blob.rel.target.replace("media/", ""), blob.data);
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function pdfToExcel(file: File): Promise<Uint8Array> {
  const pages = await extractPdfLayout(file);
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const page of pages) {
    // Split every line into cells while keeping each cell's start-x, then
    // cluster those x positions into page-wide columns so cells align into the
    // same column across rows (true table fidelity instead of per-line guesses).
    const lineCells = page.lines.map((line) => cellsWithX(line));
    const colTolerance = Math.max(
      14,
      median(page.lines.map((line) => line.fontSize).filter((s) => s > 0)) * 1.2,
    );
    const columns = clusterColumns(
      lineCells.flat().map((cell) => cell.x),
      colTolerance,
    );

    const rows = lineCells.map((cells) => {
      if (columns.length <= 1) {
        return [cells.map((cell) => cell.text).join(" ").trim()];
      }
      const row: string[] = Array.from({ length: columns.length }, () => "");
      for (const cell of cells) {
        const index = assignToColumn(cell.x, columns);
        row[index] = row[index] ? `${row[index]} ${cell.text}`.trim() : cell.text;
      }
      return row;
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
  // extractPdfLayout группирует элементы по Y-координате и сохраняет переносы
  // строк/табуляцию (через lineTextFromItems). Раньше pdfToText делал собственный
  // join(" "), из-за чего весь текст страницы схлопывался в одну строку.
  const pages = await extractPdfLayout(file);
  let hasText = false;
  const textParts = pages.map((page) => {
    const pageText = page.lines.map((line) => line.text).join("\n");
    if (pageText.trim()) hasText = true;
    return `--- Page ${page.pageNumber} ---\n${pageText}`;
  });
  // Нет текстового слоя: не отдаём пустую строку с одними разделителями,
  // а подсказываем про OCR (как pdfToWord/pdfToExcel).
  if (!hasText) {
    throw new Error(
      "No selectable text was found. This PDF may be a scan or image - try the OCR PDF tool first."
    );
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
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      // Клампим масштаб так, чтобы площадь холста не превышала лимит браузера
      // (~268МП) — иначе toDataURL бросает; берём безопасные 25МП.
      const base = page.getViewport({ scale });
      const maxArea = 25_000_000;
      const safeScale = base.width * base.height > maxArea
        ? scale * Math.sqrt(maxArea / (base.width * base.height))
        : scale;
      const viewport = page.getViewport({ scale: safeScale });
      const { canvas, ctx } = createRenderCanvas(viewport.width, viewport.height);
      await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport, canvas: canvas as HTMLCanvasElement }).promise;
      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      const dataUrl = await canvasToDataUrl(canvas, mimeType, 0.92);
      results.push({ dataUrl, page: i });
      // Освобождаем память страницы и холста перед следующей итерацией
      releaseCanvas(canvas);
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
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
    if (!base64) continue;
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
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(bytes) / Math.log(k))));
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

/**
 * Adaptive render scale for OCR. Bounds the page's long side to ~`targetLongSide`
 * pixels so very large pages stay fast (fewer pixels for Tesseract to scan) while
 * small pages are upscaled to a legible DPI. Clamped to [min, max].
 */
export function ocrRenderScale(
  pageWidth: number,
  pageHeight: number,
  targetLongSide = 1800,
  min = 0.5,
  max = 3,
): number {
  const longSide = Math.max(pageWidth, pageHeight, 1);
  return Math.min(max, Math.max(min, targetLongSide / longSide));
}

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

  // worker создан выше; всё дальнейшее — в try/finally, чтобы worker
  // гарантированно терминировался даже при ошибке embedFont/render.
  try {
    const resultPdf = await PDFDocument.create();
    const stdFont = await resultPdf.embedFont(StandardFonts.Helvetica);
    let unicodeFontPromise: Promise<any> | null = null;
    const getWordFont = async (text: string) => {
      if (!needsUnicode(text)) return stdFont;
      unicodeFontPromise ??= embedUnicodeFont(resultPdf);
      return unicodeFontPromise;
    };

    for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
      onProgress?.(25 + Math.round(((pageNum - 1) / pdfjsDoc.numPages) * 70));

      const page = await pdfjsDoc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const scale = ocrRenderScale(base.width, base.height);
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

      for (const word of (data as any).words) {
        if (!word.text.trim() || word.confidence < 30) continue;
        const { x0, y0, y1 } = word.bbox;
        // convertToPdfPoint учитывает rotation/scale/Y-flip; для rotation=0
        // эквивалентно (x0/scale, H - y1/scale). Невидимый слой ложится поверх
        // повёрнутого контента в правильном месте.
        const [pdfX, pdfY] = viewport.convertToPdfPoint(x0, y1);
        const [, pdfYtop] = viewport.convertToPdfPoint(x0, y0);
        const wordH = Math.max(4, Math.abs(pdfYtop - pdfY));
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
      // Освобождаем холст и страницу перед следующей итерацией
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }

    onProgress?.(98);
    return resultPdf.save();
  } finally {
    await worker.terminate();
    await pdfjsDoc.destroy();
  }
}

// ============================================================
// ADD BLANK PAGES
// ============================================================
export async function addBlankPages(file: File, positions: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const existingPages = pdfDoc.getPages();
  const defaultWidth = existingPages.length > 0 ? existingPages[0].getSize().width : 595.28;
  const defaultHeight = existingPages.length > 0 ? existingPages[0].getSize().height : 841.89;
  const sortedPositions = [...positions].sort((a, b) => b - a);
  for (const pos of sortedPositions) {
    const insertIdx = Math.min(pos, pdfDoc.getPageCount());
    const page = pdfDoc.insertPage(insertIdx, [defaultWidth, defaultHeight]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText("", { x: 0, y: 0, size: 1, font });
  }
  return pdfDoc.save();
}

// ============================================================
// SANITIZE PDF
// ============================================================
export async function sanitizePdf(file: File): Promise<Uint8Array> {
  const { PDFName, PDFDict } = await import("pdf-lib");
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));

  // Remove JavaScript, auto-run actions, and tracking
  const catalog = doc.catalog;
  for (const key of ["OpenAction", "AA", "URI"]) {
    catalog.delete(PDFName.of(key));
  }
  const namesVal = catalog.get(PDFName.of("Names"));
  if (namesVal instanceof PDFDict) {
    namesVal.delete(PDFName.of("JavaScript"));
    namesVal.delete(PDFName.of("EmbeddedFiles"));
  }
  for (const page of doc.getPages()) {
    const pageDict = doc.context.lookup(page.ref);
    if (pageDict instanceof PDFDict) {
      pageDict.delete(PDFName.of("AA"));
      pageDict.delete(PDFName.of("JS"));
    }
  }

  return doc.save();
}

// ============================================================
// PDF TO PDF/A
// ============================================================
export async function convertToPdfA(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  pdfDoc.setProducer("PDFX.tools PDF/A Converter");
  if (!pdfDoc.getCreator()) pdfDoc.setCreator("PDFX.tools");
  pdfDoc.setKeywords(["PDF/A-1b", "archival"]);
  pdfDoc.setModificationDate(new Date());
  return pdfDoc.save({ useObjectStreams: false });
}

// ============================================================
// EXTRACT FORM FIELDS
// ============================================================
export async function extractFormFields(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const fieldData = fields.map((field) => {
    const name = field.getName();
    const type = field.constructor.name;
    let value: any = null;
    try {
      if (type === "PDFTextField") {
        value = (field as any).getText?.() ?? null;
      } else if (type === "PDFCheckBox") {
        value = (field as any).isChecked?.() ?? false;
      } else if (type === "PDFRadioGroup") {
        value = (field as any).getSelected?.() ?? null;
      } else if (type === "PDFDropdown") {
        value = (field as any).getSelected?.() ?? [];
      } else if (type === "PDFOptionList") {
        value = (field as any).getSelected?.() ?? [];
      }
    } catch {}
    return { name, type, value };
  });
  return JSON.stringify(fieldData, null, 2);
}

// ============================================================
// INVERT COLORS — canvas pixel inversion per page
// ============================================================
export async function invertColors(
  file: File,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const pageCount = srcDoc.numPages;
    const dstDoc = await PDFDocument.create();

for (let i = 1; i <= pageCount; i++) {
    onProgress?.(Math.round((i / pageCount) * 100));
    if (i % 3 === 0) await yieldToUI();
    const page = await srcDoc.getPage(i);
    const vp = page.getViewport({ scale: 1.5 });
    const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
    await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas: canvas as HTMLCanvasElement }).promise;
    // Invert pixels
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let j = 0; j < d.length; j += 4) {
      d[j] = 255 - d[j];
      d[j + 1] = 255 - d[j + 1];
      d[j + 2] = 255 - d[j + 2];
    }
    ctx.putImageData(imgData, 0, 0);
    const jpegBytes = await canvasToJpegBytes(canvas, 0.92);
    const jpgImg = await dstDoc.embedJpg(jpegBytes);
    const { width: pw, height: ph } = page.getViewport({ scale: 1 });
    const dstPage = dstDoc.addPage([pw, ph]);
    dstPage.drawImage(jpgImg, { x: 0, y: 0, width: pw, height: ph });
  }
    return dstDoc.save();
  } finally {
    srcDoc.destroy();
  }
}

// ============================================================
// TO SINGLE PAGE — stack all pages into one tall page
// ============================================================
// pdf-lib's embedPages() throws "Can't embed page with missing Contents" on
// pages that have no content stream — i.e. truly blank pages, or padding pages
// created via addPage() that were never drawn on. Such pages embed as nothing
// anyway, so callers below skip them rather than crash. This keeps the page
// geometry intact (the blank page still occupies its slot, just undrawn).
function pageHasContents(page: PDFPage): boolean {
  return page.node.get(PDFName.of("Contents")) !== undefined;
}

export async function toSinglePage(
  file: File,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const srcBytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();
  if (pageCount === 0) throw new Error("The PDF has no pages.");
  const dstDoc = await PDFDocument.create();

  // Calculate total height and max width
  let totalHeight = 0;
  let maxWidth = 0;
  const pageSizes: { w: number; h: number }[] = [];
  for (let i = 0; i < pageCount; i++) {
    const p = srcDoc.getPage(i);
    const { width: w, height: h } = p.getSize();
    pageSizes.push({ w, h });
    totalHeight += h;
    if (w > maxWidth) maxWidth = w;
  }

  const singlePage = dstDoc.addPage([maxWidth, totalHeight]);
  // Embed only pages that have a content stream; blank pages are left undrawn
  // but still occupy their vertical space below.
  const srcPages = srcDoc.getPages();
  const embeddable = srcPages.filter(pageHasContents);
  const embeddedList = await dstDoc.embedPages(embeddable);
  let ei = 0;
  const embeddedByIndex = srcPages.map((p) =>
    pageHasContents(p) ? embeddedList[ei++] : null
  );
  let yOffset = totalHeight;

  for (let i = 0; i < pageCount; i++) {
    onProgress?.(Math.round((i / pageCount) * 100));
    const { w, h } = pageSizes[i];
    yOffset -= h;
    const xOffset = (maxWidth - w) / 2; // center if narrower
    const emb = embeddedByIndex[i];
    if (emb) singlePage.drawPage(emb, { x: xOffset, y: yOffset, width: w, height: h });
  }
  return dstDoc.save();
}

// ============================================================
// REMOVE IMAGES — delete all image XObjects from pages
// ============================================================
export async function removeImages(file: File): Promise<Uint8Array> {
  const { PDFDocument, PDFName, PDFDict } = await import("pdf-lib");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  for (const page of pages) {
    try {
const resources = page.node.get(PDFName.of("Resources")) as typeof PDFDict.prototype | undefined;
      if (!resources) continue;
      const xObject = resources.get(PDFName.of("XObject")) as typeof PDFDict.prototype | undefined;
      if (!xObject) continue;
      const keys = xObject.keys();
      for (const key of keys) {
        const obj = xObject.get(key);
        if (!obj) continue;
        // Check if it's an image XObject
        try {
          const dict = doc.context.lookup(obj) as typeof PDFDict.prototype;
          const subtype = dict?.get(PDFName.of("Subtype"));
          if (subtype?.toString() === "/Image") {
            xObject.delete(key);
          }
        } catch { /* skip non-dict refs */ }
      }
    } catch { /* skip pages with errors */ }
  }
  return doc.save();
}

// ============================================================
// FORM FILL — read and fill AcroForm fields
// ============================================================
export interface PdfFormField {
  name: string;
  type: "text" | "checkbox" | "radio" | "select" | "unknown";
  value?: string;
  options?: string[]; // for select/radio
}

export async function getPdfFormFields(file: File): Promise<PdfFormField[]> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const fields: PdfFormField[] = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const typeName = field.constructor.name;
    if (typeName.includes("TextField")) {
      const tf = form.getTextField(name);
      fields.push({ name, type: "text", value: tf.getText() ?? "" });
    } else if (typeName.includes("CheckBox")) {
      const cb = form.getCheckBox(name);
      fields.push({ name, type: "checkbox", value: cb.isChecked() ? "true" : "false" });
    } else if (typeName.includes("RadioGroup")) {
      const rg = form.getRadioGroup(name);
      fields.push({ name, type: "radio", value: rg.getSelected() ?? "", options: rg.getOptions() });
    } else if (typeName.includes("Dropdown")) {
      const dd = form.getDropdown(name);
      fields.push({ name, type: "select", value: dd.getSelected()[0] ?? "", options: dd.getOptions() });
    } else {
      fields.push({ name, type: "unknown" });
    }
  }
  return fields;
}

export async function fillPdfForm(
  file: File,
  fieldValues: Record<string, string>
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  // Не-ASCII значения (кириллица и т.п.) ломают авто-генерацию appearance
  // дефолтным Helvetica при save() → нужен embed Unicode-шрифта.
  const hasUnicode = Object.values(fieldValues).some((v) => needsUnicode(v ?? ""));
  for (const field of form.getFields()) {
    const name = field.getName();
    const val = fieldValues[name];
    if (val === undefined) continue;
    const typeName = field.constructor.name;
    try {
      if (typeName.includes("TextField")) {
        form.getTextField(name).setText(val);
      } else if (typeName.includes("CheckBox")) {
        if (val === "true") form.getCheckBox(name).check();
        else form.getCheckBox(name).uncheck();
      } else if (typeName.includes("RadioGroup")) {
        form.getRadioGroup(name).select(val);
      } else if (typeName.includes("Dropdown")) {
        form.getDropdown(name).select(val);
      }
    } catch { /* skip invalid option values */ }
  }
  if (hasUnicode) {
    const uniFont = await embedUnicodeFont(doc);
    form.updateFieldAppearances(uniFont);
    return doc.save({ updateFieldAppearances: false });
  }
  return doc.save();
}

// ============================================================
// SPLIT BY CHAPTERS — split PDF at bookmark boundaries → ZIP
// ============================================================
export async function splitByChapters(
  file: File,
  onProgress?: (p: number) => void
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const { PDFDocument } = await import("pdf-lib");
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Get outline
  const viewDoc = await pdfjs.getDocument({ data: bytes }).promise;
  const chapters: { title: string; page: number }[] = [];
  try {
    const outline = await viewDoc.getOutline();
    if (!outline || outline.length === 0) return [{ name: file.name, bytes }];

    // Resolve page numbers for each top-level chapter
    for (const item of outline) {
      if (item.dest) {
        try {
          let dest: any = item.dest;
          if (typeof dest === "string") dest = await viewDoc.getDestination(dest);
          if (Array.isArray(dest) && dest[0]) {
            const pageIndex = await viewDoc.getPageIndex(dest[0]);
            chapters.push({ title: item.title || `Chapter ${chapters.length + 1}`, page: pageIndex });
          }
        } catch { /* skip unresolvable */ }
      }
    }
  } finally {
    viewDoc.destroy();
  }
  if (chapters.length === 0) return [{ name: file.name, bytes }];

  // PDF outlines aren't guaranteed to be in page order; sort so chapter
  // ranges (start = this page, end = next chapter's page) stay valid.
  chapters.sort((a, b) => a.page - b.page);

  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const results: { name: string; bytes: Uint8Array }[] = [];

  for (let i = 0; i < chapters.length; i++) {
    onProgress?.(Math.round((i / chapters.length) * 100));
    const startPage = chapters[i].page;
    const endPage = i + 1 < chapters.length ? chapters[i + 1].page : totalPages;
    if (startPage >= endPage) continue;
    const chapterDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: endPage - startPage }, (_, k) => startPage + k);
    const copied = await chapterDoc.copyPages(srcDoc, pageIndices);
    copied.forEach((p) => chapterDoc.addPage(p));
    const chapterBytes = await chapterDoc.save();
    const safeName = chapters[i].title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s_-]/g, "").trim().slice(0, 60) || `chapter-${i + 1}`;
    results.push({ name: `${safeName}.pdf`, bytes: chapterBytes });
  }
  return results;
}

// ============================================================
// BOOKLET IMPOSITION — reorder pages for booklet printing
// ============================================================
export async function bookletImposition(
  file: File,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  let pageCount = srcDoc.getPageCount();
  if (pageCount === 0) throw new Error("The PDF has no pages.");

  // Pad to multiple of 4 (ref на первую страницу берём ДО цикла — она точно есть)
  const ref = srcDoc.getPages()[0];
  while (pageCount % 4 !== 0) {
    const blankPage = srcDoc.addPage();
    blankPage.setSize(ref.getWidth(), ref.getHeight());
    pageCount++;
  }

  // Build booklet page order: [N, 1, 2, N-1, N-2, 3, 4, N-3, ...]
  const order: number[] = [];
  let lo = 0, hi = pageCount - 1;
  while (lo <= hi) {
    order.push(hi, lo, lo + 1, hi - 1);
    lo += 2; hi -= 2;
  }

  const dstDoc = await PDFDocument.create();
  const firstPage = srcDoc.getPage(0);
  const pageW = firstPage.getWidth();
  const pageH = firstPage.getHeight();
  const sheetW = pageW * 2; // landscape sheet: two portrait pages side by side
  const allPages = srcDoc.getPages();

  for (let i = 0; i < order.length; i += 2) {
    onProgress?.(Math.round((i / order.length) * 100));
    const sheet = dstDoc.addPage([sheetW, pageH]);
    const leftSrc = allPages[order[i]];
    const rightSrc = allPages[order[i + 1]];
    // Padding pages (added via addPage above) and blank pages have no content
    // stream — skip embedding them so embedPages() doesn't throw; their half of
    // the sheet is simply left blank.
    const toEmbed = [leftSrc, rightSrc].filter(pageHasContents);
    const embedded = toEmbed.length ? await dstDoc.embedPages(toEmbed) : [];
    let k = 0;
    // Left page
    if (pageHasContents(leftSrc))
      sheet.drawPage(embedded[k++], { x: 0, y: 0, width: pageW, height: pageH });
    // Right page
    if (pageHasContents(rightSrc))
      sheet.drawPage(embedded[k++], { x: pageW, y: 0, width: pageW, height: pageH });
  }
  return dstDoc.save();
}

// ============================================================
// SCANNER EFFECT — aged/scanned document look
// ============================================================
export async function scannerEffect(
  file: File,
  intensity: number = 0.5, // 0–1
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const pageCount = srcDoc.numPages;
    const dstDoc = await PDFDocument.create();

for (let i = 1; i <= pageCount; i++) {
    onProgress?.(Math.round((i / pageCount) * 100));
    if (i % 3 === 0) await yieldToUI();
    const page = await srcDoc.getPage(i);
    const vp = page.getViewport({ scale: 1.5 });
    const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas: canvas as HTMLCanvasElement }).promise;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let j = 0; j < d.length; j += 4) {
      // Slight yellow tint (aged paper)
      d[j] = Math.min(255, d[j] + Math.round(20 * intensity));
      d[j + 1] = Math.min(255, d[j + 1] + Math.round(15 * intensity));
      d[j + 2] = Math.max(0, d[j + 2] - Math.round(20 * intensity));
      // Random noise
      const noise = (Math.random() - 0.5) * 30 * intensity;
      d[j] = Math.max(0, Math.min(255, d[j] + noise));
      d[j + 1] = Math.max(0, Math.min(255, d[j + 1] + noise));
      d[j + 2] = Math.max(0, Math.min(255, d[j + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const jpegBytes = await canvasToJpegBytes(canvas, 0.88);
    const jpgImg = await dstDoc.embedJpg(jpegBytes);
    const { width: pw, height: ph } = page.getViewport({ scale: 1 });
    const dstPage = dstDoc.addPage([pw, ph]);
    dstPage.drawImage(jpgImg, { x: 0, y: 0, width: pw, height: ph });
  }
    return dstDoc.save();
  } finally {
    srcDoc.destroy();
  }
}

// ============================================================
// CROP PDF — trim margins from all pages (manual mm or auto-detect)
// ============================================================
export async function cropPdf(
  file: File,
  options: { topMm?: number; rightMm?: number; bottomMm?: number; leftMm?: number; autoCrop?: boolean },
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const mmToPt = 2.8346;

  if (options.autoCrop) {
    const pdfjs = await loadPdfJs();
    const srcDoc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
    try {
      for (let i = 0; i < pages.length; i++) {
        onProgress?.(Math.round(((i + 1) / pages.length) * 100));
        const srcPage = await srcDoc.getPage(i + 1);
        const vp = srcPage.getViewport({ scale: 1 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d")!;
        await srcPage.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        const threshold = 240;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const brightness = (d[idx] + d[idx + 1] + d[idx + 2]) / 3;
            if (brightness < threshold) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX > minX && maxY > minY) {
          const padding = 5;
          minX = Math.max(0, minX - padding);
          minY = Math.max(0, minY - padding);
          maxX = Math.min(canvas.width, maxX + padding);
          maxY = Math.min(canvas.height, maxY + padding);

          // convertToPdfPoint инвертирует scale + rotation + Y-flip, отдавая
          // координаты в PDF user space — ровно то, что ждёт setCropBox.
          // Корректно для повёрнутых страниц (/Rotate) и ненулевого origin.
          const [px0, py0] = vp.convertToPdfPoint(minX, maxY);
          const [px1, py1] = vp.convertToPdfPoint(maxX, minY);
          const cropX = Math.min(px0, px1);
          const cropY = Math.min(py0, py1);
          const cropW = Math.abs(px1 - px0);
          const cropH = Math.abs(py1 - py0);

          pages[i].setCropBox(cropX, cropY, cropW, cropH);
        }
      }
    } finally {
      srcDoc.destroy();
    }
  } else {
    const topMm = options.topMm ?? 0;
    const rightMm = options.rightMm ?? 0;
    const bottomMm = options.bottomMm ?? 0;
    const leftMm = options.leftMm ?? 0;
    for (const page of pages) {
      const { width, height } = page.getSize();
      // CropBox is in absolute page space, so offset by the MediaBox origin
      // (non-zero on some PDFs) and clamp to keep width/height positive.
      const mb = page.getMediaBox();
      const cropW = width - (leftMm + rightMm) * mmToPt;
      const cropH = height - (topMm + bottomMm) * mmToPt;
      if (cropW <= 0 || cropH <= 0) continue;
      page.setCropBox(
        mb.x + leftMm * mmToPt,
        mb.y + bottomMm * mmToPt,
        cropW,
        cropH
      );
    }
  }
  return pdfDoc.save();
}

// ============================================================
// PDF METADATA — view and edit metadata
// ============================================================
export async function getPdfMetadata(file: File): Promise<Record<string, string>> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const meta: Record<string, string> = {};
  meta.title = pdfDoc.getTitle() ?? "";
  meta.author = pdfDoc.getAuthor() ?? "";
  meta.subject = pdfDoc.getSubject() ?? "";
  meta.keywords = (pdfDoc.getKeywords() ?? "").split(",").map(k => k.trim()).filter(Boolean).join(", ");
  meta.creator = pdfDoc.getCreator() ?? "";
  meta.producer = pdfDoc.getProducer() ?? "";
  const modDate = pdfDoc.getModificationDate();
  meta.modDate = modDate ? modDate.toISOString() : "";
  const creationDate = pdfDoc.getCreationDate();
  meta.creationDate = creationDate ? creationDate.toISOString() : "";
  return meta;
}

export async function setPdfMetadata(
  file: File,
  metadata: Record<string, string>
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) pdfDoc.setKeywords(metadata.keywords.split(",").map(k => k.trim()));
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator);
  // Producer задаём после прочих полей: pdf-lib иначе перетирает его своей
  // подписью при save(). Пустая строка очищает поле.
  if (metadata.producer !== undefined) pdfDoc.setProducer(metadata.producer);
  if (metadata.creationDate !== undefined && metadata.creationDate) {
    const d = new Date(metadata.creationDate);
    if (!isNaN(d.getTime())) pdfDoc.setCreationDate(d);
  }
  if (metadata.modDate !== undefined && metadata.modDate) {
    const d = new Date(metadata.modDate);
    if (!isNaN(d.getTime())) pdfDoc.setModificationDate(d);
  }
  return pdfDoc.save();
}

// ============================================================
// COMPARE PDF — side-by-side comparison → single PDF
// ============================================================
export async function comparePdf(
  file1: File,
  file2: File,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const pdfjs = await loadPdfJs();
  const bytes1 = new Uint8Array(await file1.arrayBuffer());
  const bytes2 = new Uint8Array(await file2.arrayBuffer());
  const doc1 = await pdfjs.getDocument({ data: bytes1 }).promise;
  const doc2 = await pdfjs.getDocument({ data: bytes2 }).promise;
  try {
    const maxPages = Math.max(doc1.numPages, doc2.numPages);

    const { PDFDocument } = await import("pdf-lib");
    const dstDoc = await PDFDocument.create();

    for (let i = 1; i <= maxPages; i++) {
      onProgress?.(Math.round(((i - 1) / maxPages) * 100));
      if (i % 3 === 0) await yieldToUI();
      const renderPage = async (doc: any, pageNum: number) => {
        try {
          const page = await doc.getPage(pageNum);
          const vp = page.getViewport({ scale: 1.5 });
          // Canvas-абстракция: OffscreenCanvas в воркере, HTMLCanvasElement в main.
          const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
          await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas: canvas as HTMLCanvasElement }).promise;
          return { canvas, width: vp.width / 1.5, height: vp.height / 1.5 };
        } catch {
          return null;
        }
      };

      const r1 = await renderPage(doc1, i);
      const r2 = await renderPage(doc2, i);

      const w1 = r1?.width ?? 595;
      const h1 = r1?.height ?? 842;
      const w2 = r2?.width ?? 595;
      const h2 = r2?.height ?? 842;
      const totalWidth = w1 + w2 + 20;
      const pageHeight = Math.max(h1, h2);

      const dstPage = dstDoc.addPage([totalWidth, pageHeight]);

      if (r1) {
        const jpegBytes = await canvasToJpegBytes(r1.canvas, 0.92);
        const img = await dstDoc.embedJpg(jpegBytes);
        dstPage.drawImage(img, { x: 0, y: 0, width: w1, height: h1 });
        releaseCanvas(r1.canvas);
      }
      if (r2) {
        const jpegBytes = await canvasToJpegBytes(r2.canvas, 0.92);
        const img = await dstDoc.embedJpg(jpegBytes);
        dstPage.drawImage(img, { x: w1 + 20, y: 0, width: w2, height: h2 });
        releaseCanvas(r2.canvas);
      }
    }
    return dstDoc.save();
  } finally {
    doc1.destroy();
    doc2.destroy();
  }
}

// ============================================================
// REMOVE BLANK PAGES — detect and remove near-blank pages
// ============================================================
export async function removeBlankPages(
  file: File,
  threshold: number = 240,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const nonBlankPages: number[] = [];
  try {
    const pageCount = doc.numPages;

    for (let i = 1; i <= pageCount; i++) {
      onProgress?.(Math.round((i / pageCount) * 50));
      if (i % 3 === 0) await yieldToUI();
      const page = await doc.getPage(i);

      // First check: does the page have text content? (like Stirling-PDF)
      let hasText = false;
      try {
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join("").trim();
        if (text.length > 0) hasText = true;
      } catch {}

      if (hasText) {
        nonBlankPages.push(i);
        continue;
      }

      // No text — render and check pixels
      const vp = page.getViewport({ scale: 1 });
      const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
      await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas: canvas as HTMLCanvasElement }).promise;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      let brightPixels = 0;
      const totalPixels = canvas.width * canvas.height;
      for (let j = 0; j < d.length; j += 4) {
        const brightness = (d[j] + d[j + 1] + d[j + 2]) / 3;
        if (brightness > threshold) brightPixels++;
      }
      if (brightPixels / totalPixels < 0.95) {
        nonBlankPages.push(i);
      }
      releaseCanvas(canvas);
    }
  } finally {
    doc.destroy();
  }

  if (nonBlankPages.length === 0) {
    nonBlankPages.push(1); // keep at least one page
  }

  const { PDFDocument } = await import("pdf-lib");
  // pdfjs.getDocument({ data: bytes }) above transfers/detaches the underlying
  // ArrayBuffer, leaving `bytes` empty — re-read from the file for pdf-lib.
  const srcBytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const dstDoc = await PDFDocument.create();
  const indices = nonBlankPages.map(p => p - 1);
  const embedded = await dstDoc.embedPages(
    indices.map(i => srcDoc.getPages()[i])
  );
  for (let i = 0; i < embedded.length; i++) {
    onProgress?.(50 + Math.round((i / embedded.length) * 50));
    const { width, height } = srcDoc.getPages()[indices[i]].getSize();
    const page = dstDoc.addPage([width, height]);
    page.drawPage(embedded[i], { x: 0, y: 0, width, height });
  }
  return dstDoc.save();
}

// ============================================================
// RESIZE PAGES — scale pages to standard sizes (vector-preserving)
// ============================================================
export async function resizePages(
  file: File,
  targetSize: "a4" | "a3" | "letter" | "legal" | "a5",
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const sizeMap: Record<string, [number, number]> = {
    a4: [595.28, 841.89],
    a3: [841.89, 1190.55],
    letter: [612, 792],
    legal: [612, 1008],
    a5: [419.53, 595.28],
  };
  const [targetW, targetH] = sizeMap[targetSize] || sizeMap.a4;
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(Math.round(((i + 1) / pages.length) * 100));
    if (i % 3 === 0) await yieldToUI();
    const page = pages[i];
    const { width: origW, height: origH } = page.getSize();

    // Пропускаем вырожденные страницы (нулевой media box) — иначе scale = NaN/Infinity
    if (!origW || !origH) continue;

    const scale = Math.min(targetW / origW, targetH / origH);
    if (!isFinite(scale) || scale <= 0) continue;
    const scaledW = origW * scale;
    const scaledH = origH * scale;
    const offsetX = (targetW - scaledW) / 2;
    const offsetY = (targetH - scaledH) / 2;

    // After scale, offsets need to be in the pre-scale coordinate space
    // translateContent works in the current (scaled) coordinate system
    page.scale(scale, scale);
    page.translateContent(offsetX / scale, offsetY / scale);
    page.setSize(targetW, targetH);
  }

  return pdfDoc.save();
}

// ============================================================
// GRAYSCALE PDF — convert to grayscale via canvas
// ============================================================
export async function grayscalePdf(
  file: File,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const pageCount = srcDoc.numPages;
    const dstDoc = await PDFDocument.create();

    for (let i = 1; i <= pageCount; i++) {
      onProgress?.(Math.round((i / pageCount) * 100));
      if (i % 3 === 0) await yieldToUI();
      const page = await srcDoc.getPage(i);
      const vp = page.getViewport({ scale: 1.5 });
      const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
      await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas: canvas as HTMLCanvasElement }).promise;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let j = 0; j < d.length; j += 4) {
        const gray = Math.round(d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114);
        d[j] = gray;
        d[j + 1] = gray;
        d[j + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);

      const jpegBytes = await canvasToJpegBytes(canvas, 0.92);
      const jpgImg = await dstDoc.embedJpg(jpegBytes);
      const { width: pw, height: ph } = page.getViewport({ scale: 1 });
      const dstPage = dstDoc.addPage([pw, ph]);
      dstPage.drawImage(jpgImg, { x: 0, y: 0, width: pw, height: ph });
    }
    return dstDoc.save();
  } finally {
    srcDoc.destroy();
  }
}

// ============================================================
// PDF BOOKMARKS — export TOC as text
// ============================================================
export async function pdfBookmarks(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const outline = await doc.getOutline();

    if (!outline || outline.length === 0) {
      return "No bookmarks found in this PDF.";
    }

    const lines: string[] = [];
    const walk = (items: any[], depth: number) => {
      for (const item of items) {
        const indent = "  ".repeat(depth);
        lines.push(`${indent}${item.title}`);
        if (item.items && item.items.length > 0) {
          walk(item.items, depth + 1);
        }
      }
    };
    walk(outline, 0);
    return lines.join("\n");
  } finally {
    doc.destroy();
  }
}

// ============================================================
// AUTO-REDACT — auto-detect and redact emails, phones, SSN, IBAN, custom regex
// ============================================================
export async function autoRedactPdf(
  file: File,
  options: { emails?: boolean; phones?: boolean; ssn?: boolean; iban?: boolean; customRegex?: string },
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const pdfjs = await loadPdfJs();
  const { PDFDocument } = await import("pdf-lib");
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Копируем буфер ДО getDocument: pdfjs передаёт data в свой воркер как
  // transferable и детачит исходный буфер — иначе pdf-lib ниже получит пустой.
  const pdfLibBytes = bytes.slice(0);
  const srcDoc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const pageCount = srcDoc.numPages;
    const pdfLib = await PDFDocument.load(pdfLibBytes, { ignoreEncryption: true });
    const resultPdf = await PDFDocument.create();
    const renderScale = 1.5;

    const patterns: RegExp[] = [];
    if (options.emails) patterns.push(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
    if (options.phones) patterns.push(/(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,4}[\s.\-]\d{2,4}[\s.\-]\d{2,4}/g);
    if (options.ssn) patterns.push(/\d{3}[-\s]?\d{2}[-\s]?\d{4}/g);
    if (options.iban) patterns.push(/[A-Za-z]{2}\d{2}[A-Za-z0-9]{11,28}/g);
    if (options.customRegex) {
      try { patterns.push(new RegExp(options.customRegex, "g")); } catch {}
    }

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const pageNumber = pageIndex + 1;
      onProgress?.(Math.round((pageIndex / pageCount) * 100));
      if (pageIndex % 3 === 0) await yieldToUI();

      const page = await srcDoc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const textItems = textContent.items as any[];

      // Sliding window groups (1–3 adjacent items) so PII split across items is caught
      const groups: Array<{ indices: number[]; text: string }> = [];
      for (let gi = 0; gi < textItems.length; gi++) {
        const t0 = (textItems[gi] as any).str as string;
        if (!t0) continue;
        groups.push({ indices: [gi], text: t0 });
        if (gi + 1 < textItems.length && (textItems[gi + 1] as any).str) {
          groups.push({ indices: [gi, gi + 1], text: t0 + (textItems[gi + 1] as any).str });
          if (gi + 2 < textItems.length && (textItems[gi + 2] as any).str) {
            groups.push({ indices: [gi, gi + 1, gi + 2], text: t0 + (textItems[gi + 1] as any).str + (textItems[gi + 2] as any).str });
          }
        }
      }

      const matchedItemIndices = new Set<number>();
      for (const group of groups) {
        for (const pattern of patterns) {
          pattern.lastIndex = 0;
          if (pattern.test(group.text)) {
            for (const idx of group.indices) matchedItemIndices.add(idx);
            break;
          }
        }
      }

      if (matchedItemIndices.size === 0) {
        const [copied] = await resultPdf.copyPages(pdfLib, [pageIndex]);
        resultPdf.addPage(copied);
        continue;
      }

      // Render page to canvas (handles rotation automatically via pdfjs viewport)
      const viewport = page.getViewport({ scale: renderScale });
      const { canvas, ctx } = createRenderCanvas(viewport.width, viewport.height);
      await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport, canvas: canvas as HTMLCanvasElement }).promise;

      // Draw black rectangles over all matching text items using viewport coordinates
      ctx.fillStyle = "#000000";
      for (let itemIdx = 0; itemIdx < textItems.length; itemIdx++) {
        if (!matchedItemIndices.has(itemIdx)) continue;
        const item = textItems[itemIdx];
        const text = item.str;
        if (!text) continue;

        if (!item.transform) continue;
        const [a, b, c, d, tx, ty] = item.transform;
        const runLen = Math.max(1, item.width || Math.hypot(a, b));
        const fontH = Math.max(6, Math.abs(item.height) || Math.hypot(c, d) || 12);
        let bx = a, by = b;
        let blen = Math.hypot(bx, by);
        if (blen === 0) { bx = 1; by = 0; blen = 1; }
        const ubx = bx / blen, uby = by / blen;
        let vx = c, vy = d;
        let vlen = Math.hypot(vx, vy);
        if (vlen === 0) { vx = -uby; vy = ubx; vlen = 1; }
        const uvx = vx / vlen, uvy = vy / vlen;
        const ascent = fontH;
        const descent = fontH * 0.25;

        const cornersPdf: [number, number][] = [
          [tx - uvx * descent, ty - uvy * descent],
          [tx + ubx * runLen - uvx * descent, ty + uby * runLen - uvy * descent],
          [tx + ubx * runLen + uvx * ascent, ty + uby * runLen + uvy * ascent],
          [tx + uvx * ascent, ty + uvy * ascent],
        ];

        let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
        for (const [cx, cy] of cornersPdf) {
          const vpPt = viewport.convertToViewportPoint(cx, cy);
          if (vpPt[0] < bx0) bx0 = vpPt[0];
          if (vpPt[0] > bx1) bx1 = vpPt[0];
          if (vpPt[1] < by0) by0 = vpPt[1];
          if (vpPt[1] > by1) by1 = vpPt[1];
        }

        const pad = 2;
        ctx.fillRect(
          Math.floor(bx0) - pad,
          Math.floor(by0) - pad,
          Math.ceil(bx1 - bx0) + pad * 2,
          Math.ceil(by1 - by0) + pad * 2
        );
      }

      // Embed the redacted canvas back into the PDF.
      // Размер страницы из viewport (учитывает /Rotate), а не getSize() —
      // иначе на ротированных страницах маски смещаются с текста.
      const imgBytes = await canvasToJpegBytes(canvas, 0.92);
      const img = await resultPdf.embedJpg(imgBytes);
      const pageW = viewport.width / renderScale;
      const pageH = viewport.height / renderScale;
      const newPage = resultPdf.addPage([pageW, pageH]);
      newPage.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
      releaseCanvas(canvas);
    }

    return resultPdf.save();
  } finally {
    srcDoc.destroy();
  }
}

// ============================================================
// N-UP PDF — arrange multiple pages per sheet
// ============================================================
export async function nUpPdf(
  file: File,
  n: 2 | 4,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const pageCount = srcDoc.numPages;
    if (pageCount === 0) throw new Error("The PDF has no pages.");
    const dstDoc = await PDFDocument.create();

    const a4w = 595.28, a4h = 841.89;
    const margin = 20;
    const cols = n === 2 ? 1 : 2;
    const rows = n === 2 ? 2 : 2;
    const cellW = (a4w - margin * (cols + 1)) / cols;
    const cellH = (a4h - margin * (rows + 1)) / rows;

    for (let sheet = 0; sheet * n < pageCount; sheet++) {
      onProgress?.(Math.round(((sheet * n) / pageCount) * 100));
      const dstPage = dstDoc.addPage([a4w, a4h]);

      for (let slot = 0; slot < n; slot++) {
        const srcPageNum = sheet * n + slot + 1;
        if (srcPageNum > pageCount) break;

        const srcPage = await srcDoc.getPage(srcPageNum);
        const vp = srcPage.getViewport({ scale: 1.5 });
        const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
        await srcPage.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas: canvas as HTMLCanvasElement }).promise;

        const jpegBytes = await canvasToJpegBytes(canvas, 0.92);
        const jpgImg = await dstDoc.embedJpg(jpegBytes);
        releaseCanvas(canvas);

        const col = slot % cols;
        const row = Math.floor(slot / cols);
        const x = margin + col * (cellW + margin);
        const y = a4h - margin - (row + 1) * (cellH + margin);

        const origW = vp.width / 1.5;
        const origH = vp.height / 1.5;
        const scale = Math.min(cellW / origW, cellH / origH);
        const drawW = origW * scale;
        const drawH = origH * scale;
        const drawX = x + (cellW - drawW) / 2;
        const drawY = y + (cellH - drawH) / 2;

        dstPage.drawImage(jpgImg, { x: drawX, y: drawY, width: drawW, height: drawH });
      }
    }
    return dstDoc.save();
  } finally {
    srcDoc.destroy();
  }
}

// ============================================================
// SPLIT BY SIZE — split PDF into parts under maxMb
// Returns single PDF if it fits, otherwise ZIP of parts
// ============================================================
export async function splitBySize(
  file: File,
  maxMb: number,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const maxBytes = maxMb * 1024 * 1024;
  const totalPages = srcDoc.getPageCount();

  // If whole file fits, return it as-is
  if (bytes.length <= maxBytes) {
    onProgress?.(100);
    return bytes;
  }

  const JSZip = (await import("jszip")).default;

  // Estimate per-page byte sizes by splitting single-page docs
  const pageSizes: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    onProgress?.(Math.round(((i + 1) / totalPages) * 40));
    const singleDoc = await PDFDocument.create();
    const [copied] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(copied);
    const saved = await singleDoc.save();
    pageSizes.push(saved.length);
  }

  // Group pages into parts that fit under maxBytes
  const parts: number[][] = [];
  let currentPart: number[] = [];
  let currentSize = 0;

  for (let i = 0; i < totalPages; i++) {
    const ps = pageSizes[i];
    if (currentPart.length === 0 || currentSize + ps <= maxBytes) {
      currentPart.push(i);
      currentSize += ps;
    } else {
      parts.push(currentPart);
      currentPart = [i];
      currentSize = ps;
    }
  }
  if (currentPart.length > 0) parts.push(currentPart);

  // Create each part as a separate PDF
  const partFiles: { name: string; bytes: Uint8Array }[] = [];
  for (let p = 0; p < parts.length; p++) {
    onProgress?.(40 + Math.round(((p + 1) / parts.length) * 50));
    const partDoc = await PDFDocument.create();
    const copiedPages = await partDoc.copyPages(srcDoc, parts[p]);
    for (const cp of copiedPages) {
      partDoc.addPage(cp);
    }
    partFiles.push({
      name: `part_${p + 1}.pdf`,
      bytes: await partDoc.save(),
    });
  }

  onProgress?.(95);
  const zip = new JSZip();
  for (const pf of partFiles) {
    zip.file(pf.name, pf.bytes);
  }
  onProgress?.(100);
  return zip.generateAsync({ type: "uint8array" });
}

// ============================================================
// OVERLAY PDF — overlay one PDF on top of another
// ============================================================
export async function overlayPdf(
  baseFile: File,
  overlayFile: File,
  opacity: number = 0.5,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const pdfjs = await loadPdfJs();
  const baseBytes = new Uint8Array(await baseFile.arrayBuffer());
  const overlayBytes = new Uint8Array(await overlayFile.arrayBuffer());
  const baseDoc = await PDFDocument.load(baseBytes, { ignoreEncryption: true });
  const overlayPdfDoc = await pdfjs.getDocument({ data: overlayBytes }).promise;
  try {
    const basePages = baseDoc.getPages();
    const overlayPageCount = overlayPdfDoc.numPages;

    for (let i = 0; i < basePages.length; i++) {
      onProgress?.(Math.round(((i + 1) / basePages.length) * 100));
      if (i % 3 === 0) await yieldToUI();
      const overlayPageNum = (i % overlayPageCount) + 1;
      const overlayPage = await overlayPdfDoc.getPage(overlayPageNum);
      const vp = overlayPage.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext("2d")!;
      await overlayPage.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

      const pngUrl = canvas.toDataURL("image/png");
      const pngBytes = Uint8Array.from(atob(pngUrl.split(",")[1]), (c) => c.charCodeAt(0));
      const pngImg = await baseDoc.embedPng(pngBytes);

      const { width: bw, height: bh } = basePages[i].getSize();
      const origW = vp.width / 1.5;
      const origH = vp.height / 1.5;
      const scale = Math.min(bw / origW, bh / origH);
      const drawW = origW * scale;
      const drawH = origH * scale;
      const x = (bw - drawW) / 2;
      const y = (bh - drawH) / 2;

      basePages[i].drawImage(pngImg, { x, y, width: drawW, height: drawH, opacity });
    }
    return baseDoc.save();
  } finally {
    overlayPdfDoc.destroy();
  }
}

// ============================================================
// PDF TO MARKDOWN — extract text with structure as Markdown
// ============================================================
export async function pdfToMarkdown(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const pages: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      if (items.length === 0) {
        pages.push(`\n---\n*Page ${i}: [image/empty]*\n`);
        continue;
      }

      const lines: { text: string; fontSize: number; y: number }[] = [];
      let currentLine = "";
      let lastY: number | null = null;
      let currentFontSize = 12;

      for (const item of items) {
        const text = item.str;
        if (text === undefined || text === null) continue;
        const fontSize = item.transform?.[0] || item.height || 12;
        const y = item.transform?.[5] ?? 0;

        if (lastY !== null && Math.abs(y - lastY) > 3) {
          if (currentLine.trim()) {
            lines.push({ text: currentLine.trim(), fontSize: currentFontSize, y: lastY });
          }
          currentLine = text;
          currentFontSize = fontSize;
        } else {
          currentLine += text;
          currentFontSize = Math.max(currentFontSize, fontSize);
        }
        lastY = y;
      }
      if (currentLine.trim()) {
        lines.push({ text: currentLine.trim(), fontSize: currentFontSize, y: lastY ?? 0 });
      }

      let pageMd = `\n---\n\n## Page ${i}\n\n`;
      let prevSize = 0;

      for (const line of lines) {
        const sizeRatio = line.fontSize / 12;
        if (sizeRatio > 1.8) {
          pageMd += `# ${line.text}\n\n`;
        } else if (sizeRatio > 1.4) {
          pageMd += `## ${line.text}\n\n`;
        } else if (sizeRatio > 1.15) {
          pageMd += `### ${line.text}\n\n`;
        } else if (line.text.match(/^\s*[-•*]\s/)) {
          pageMd += `${line.text.replace(/^[•*]\s/, "- ")}\n`;
        } else {
          pageMd += `${line.text}\n`;
        }
        prevSize = line.fontSize;
      }
      pages.push(pageMd);
    }

    return pages.join("\n");
  } finally {
    doc.destroy();
  }
}

// ============================================================
// ADD BACKGROUND — add colored background to all pages
// ============================================================
export async function addBackground(
  file: File,
  color: { r: number; g: number; b: number },
  opacity: number = 0.15
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    // BlendMode.Multiply: прямоугольник тонирует страницу, а не перекрывает её.
    // При умножении тёмный текст (≈0) остаётся тёмным и читаемым, белый фон
    // приобретает выбранный оттенок. Без этого drawRectangle пишется в конец
    // content stream и кладётся ПОВЕРХ текста, приглушая его даже при opacity 0.15.
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(color.r / 255, color.g / 255, color.b / 255),
      opacity,
      blendMode: BlendMode.Multiply,
    });
  }
  return pdfDoc.save();
}

// ============================================================
// PDF DIFF — highlight differences between two PDFs
// ============================================================
export async function pdfDiff(
  file1: File,
  file2: File,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const pdfjs = await loadPdfJs();
  const bytes1 = new Uint8Array(await file1.arrayBuffer());
  const bytes2 = new Uint8Array(await file2.arrayBuffer());
  const doc1 = await pdfjs.getDocument({ data: bytes1 }).promise;
  const doc2 = await pdfjs.getDocument({ data: bytes2 }).promise;
  try {
    const { PDFDocument, rgb } = await import("pdf-lib");
    const maxPages = Math.max(doc1.numPages, doc2.numPages);
    const srcBytes = await file1.arrayBuffer();
    const dstDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });

    for (let i = 1; i <= Math.min(doc1.numPages, doc2.numPages); i++) {
      onProgress?.(Math.round((i / maxPages) * 80));
      const text1 = await (await doc1.getPage(i)).getTextContent();
      const text2 = await (await doc2.getPage(i)).getTextContent();
      const str1 = text1.items.map((it: any) => it.str).join("");
      const str2 = text2.items.map((it: any) => it.str).join("");

      if (str1 !== str2) {
        const pdfPage = dstDoc.getPages()[i - 1];
        const { width, height } = pdfPage.getSize();
        pdfPage.drawRectangle({
          x: 0,
          y: height - 20,
          width,
          height: 20,
          color: rgb(1, 0.85, 0.85),
          opacity: 0.5,
        });
      }
    }

    // dstDoc was loaded from file1, so it only has doc1's pages. Pages that
    // exist only in file2 must be copied in, otherwise additions are silently
    // dropped from the diff output.
    if (doc2.numPages > doc1.numPages) {
      const file2Doc = await PDFDocument.load(bytes2, { ignoreEncryption: true });
      const extraIndices = Array.from(
        { length: doc2.numPages - doc1.numPages },
        (_, k) => doc1.numPages + k
      );
      const copied = await dstDoc.copyPages(file2Doc, extraIndices);
      copied.forEach((p, k) => {
        onProgress?.(80 + Math.round(((k + 1) / copied.length) * 20));
        dstDoc.addPage(p);
        const { width, height } = p.getSize();
        p.drawRectangle({
          x: 0,
          y: height - 30,
          width,
          height: 30,
          color: rgb(0.85, 0.85, 1),
          opacity: 0.5,
        });
      });
    }

    return dstDoc.save();
  } finally {
    doc1.destroy();
    doc2.destroy();
  }
}

// ============================================================
// PDF TO AUDIO — text-to-speech via Web Speech API
// ============================================================
export function pdfToAudio(text: string, lang: string = "en-US", rate: number = 1): void {
  if (!("speechSynthesis" in window)) {
    throw new Error("Speech synthesis not supported in this browser.");
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

// ============================================================
// PDF TO PPTX — convert PDF pages to PowerPoint slides
// ============================================================
export async function pdfToPptx(
  file: File,
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await pdfjs.getDocument({ data: bytes }).promise;
  const pageCount = srcDoc.numPages;
  const pptx = new PptxGenJS();

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(Math.round((i / pageCount) * 100));
    if (i % 2 === 0) await yieldToUI();
    const page = await srcDoc.getPage(i);
    const vp = page.getViewport({ scale: 2 });
    const { canvas, ctx } = createRenderCanvas(vp.width, vp.height);
    await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport: vp, canvas: canvas as HTMLCanvasElement }).promise;

    // JPEG вместо PNG: для страниц с текстом PNG в разы тяжелее и копится в
    // pptx до финальной записи — на больших файлах даёт OOM/гигантский .pptx.
    const dataUrl = await canvasToDataUrl(canvas, "image/jpeg", 0.85);
    const slide = pptx.addSlide();
    slide.addImage({
      data: dataUrl,
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
    });
    // Освобождаем холст и страницу перед следующей итерацией
    releaseCanvas(canvas);
    page.cleanup();
  }

  await srcDoc.destroy();
  const pptxOutput = await pptx.write({ outputType: "arraybuffer" as const });
  const buffer = pptxOutput instanceof ArrayBuffer ? pptxOutput : new Uint8Array(pptxOutput as ArrayBuffer).buffer;
  return new Uint8Array(buffer);
}