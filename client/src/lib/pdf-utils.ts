import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

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
  rotation: number = 45
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
    page.drawText(text, {
      x: width / 2 - (text.length * fontSize) / 4,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotation),
    });
  });
  return pdf.save();
}

export async function addPageNumbers(
  file: File,
  position: "bottom-center" | "bottom-right" | "bottom-left" | "top-center" = "bottom-center",
  startFrom: number = 1
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const text = `${i + startFrom}`;
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

export async function compressPdf(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const saved = await pdf.save({ useObjectStreams: true });
  if (saved.byteLength >= bytes.byteLength) return new Uint8Array(bytes);
  return saved;
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    let image;
    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      image = await pdf.embedJpg(bytes);
    } else {
      image = await pdf.embedPng(bytes);
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

export async function protectPdf(_file: File, _password: string): Promise<Uint8Array> {
  throw new Error(
    "PDF password encryption is not supported in the browser version. " +
    "Please use Adobe Acrobat, LibreOffice, or a desktop PDF tool to add password protection. " +
    "This feature is planned for the PDFX Pro server-side release."
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

export async function redactPdf(
  file: File,
  searchText: string,
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  if (!searchText.trim()) {
    throw new Error("Please enter the text you want to redact.");
  }

  const bytes = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;

  const srcBytes = new Uint8Array(bytes);
  const pdfjsDoc = await withTimeout(
    pdfjs.getDocument({ data: srcBytes }).promise,
    30_000,
    "PDF loading timed out. The file may be corrupted or too complex."
  );

  const pdfLib = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const resultPdf = await PDFDocument.create();
  const searchLower = searchText.trim().toLowerCase();
  const RENDER_SCALE = 1.5;

  onProgress?.(15);

  for (let pageIndex = 0; pageIndex < pdfjsDoc.numPages; pageIndex++) {
    const pagePct = 15 + Math.round((pageIndex / pdfjsDoc.numPages) * 75);
    onProgress?.(pagePct);
    const page = await pdfjsDoc.getPage(pageIndex + 1);

    let textItems: any[] = [];
    try {
      const tc = await withTimeout(page.getTextContent(), 10_000, "");
      textItems = tc.items ?? [];
    } catch {
      // If text extraction fails, copy the page as-is
      const [copied] = await resultPdf.copyPages(pdfLib, [pageIndex]);
      resultPdf.addPage(copied);
      continue;
    }

    const matchingItems = textItems.filter(
      (item: any) => item.str && item.str.toLowerCase().includes(searchLower)
    );

    if (matchingItems.length === 0) {
      const [copied] = await resultPdf.copyPages(pdfLib, [pageIndex]);
      resultPdf.addPage(copied);
      continue;
    }

    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;

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
    for (const item of matchingItems) {
      const it = item as any;
      if (!it.transform) continue;
      const [, , , , tx, ty] = it.transform;
      const pt = viewport.convertToViewportPoint(tx, ty);
      const fontHeight = Math.abs(it.transform[3]) * RENDER_SCALE;
      const textW = (it.width || 0) * RENDER_SCALE;
      ctx.fillRect(
        Math.floor(pt[0]) - 2,
        Math.floor(pt[1]) - fontHeight - 2,
        Math.ceil(textW) + 6,
        Math.ceil(fontHeight) + 6
      );
    }

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

export async function getPdfPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}
