import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { PDFDocument } from "pdf-lib";
import {
  MousePointer2, Type, Pencil, Image as ImageIcon, PenLine,
  Square, Circle, Minus, Highlighter, Eraser, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize2, Download, ArrowLeft, ChevronLeft, ChevronRight,
  Upload, Loader2, ArrowRight, Copy, ClipboardPaste, Trash2, ChevronsUp, ChevronsDown,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";
import { DEFAULT_MAX_FILE_SIZE_MB, mbToBytes } from "@/lib/upload-limits";

type ToolType = "select" | "text" | "draw" | "image" | "sign" | "rect" | "circle" | "line" | "highlight" | "eraser";
type DrawColor = "#1a1a1a" | "#e53e3e" | "#3182ce" | "#38a169" | "#facc15";
type TextAlignOption = "left" | "center" | "right" | "justify";

interface PageDims { width: number; height: number }
interface TextSegmentMetric {
  top: number;
  bottom: number;
  left: number;
  right: number;
  centerY: number;
  height: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

interface TextLineMetric {
  top: number;
  bottom: number;
  left: number;
  right: number;
  centerY: number;
  height: number;
  text: string;
  segments: TextSegmentMetric[];
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

interface TextInsertionStyle {
  left: number;
  top: number;
  maxWidth: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

interface ActiveTextEditor {
  pageNumber: number;
  left: number;
  top: number;
  baselineY: number | null;
  width: number;
  maxWidth: number;
  minHeight: number;
  lineHeight: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  underline: boolean;
  textAlign: TextAlignOption;
  color: string;
  backgroundColor: string;
  text: string;
  sourceObject?: any | null;
}

const DISPLAY_SCALE = 1.5;
const THUMB_SCALE = 0.15;
const MAX_EDIT_PDF_FILE_SIZE_MB = DEFAULT_MAX_FILE_SIZE_MB;
const EDITOR_COLORS: DrawColor[] = ["#1a1a1a", "#e53e3e", "#3182ce", "#38a169", "#facc15"];
const EDITOR_FONT_FAMILIES = ["Arial", "Calibri", "Cambria", "Times New Roman", "Georgia", "Garamond", "Courier New"] as const;
const DISALLOWED_FONT_FAMILIES = new Set([
  "Clock2017L_v0.4_170118",
  "Clock2017R_v0.4_170118",
  "clock2016_v1.1",
  "AndroidClock",
  "Noto Color Emoji",
  "Noto Naskh Arabic",
  "Noto Naskh Arabic UI",
  "Noto Sans Symbols",
  "Noto Sans Symbols2",
  "Noto Sans Mono",
  "SamsungKhmerUI",
  "SamsungMyanmarUI",
  "SamsungMyanmarZawgyiUI",
  "SamsungThaiUI",
  "SECFallback",
]);
const PDFX_TEXT_CUSTOM_PROPS = ["pdfxBaseFontSize", "pdfxMaxWidth", "pdfxBaseTop", "pdfxBaseLineHeight", "pdfxBaselineY", "pdfxAutoWidth"] as const;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;
  return pdfjs;
}

async function renderPageToCanvas(
  pdfjsDoc: any, pageNum: number, canvas: HTMLCanvasElement, scale: number
) {
  const page = await pdfjsDoc.getPage(pageNum);
  const vp = page.getViewport({ scale });
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  return { width: vp.width, height: vp.height };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function hexToRgba(hex: string, alpha: number) {
  const sanitized = hex.replace("#", "");
  const normalized = sanitized.length === 3
    ? sanitized.split("").map((char) => char + char).join("")
    : sanitized;
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeEditorFontFamily(fontFamily?: string) {
  const normalized = (fontFamily ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Arial";
  if (DISALLOWED_FONT_FAMILIES.has(normalized)) return "Arial";
  return normalized;
}

function isEditableTextObject(obj: any) {
  return obj?.type === "textbox" || obj?.type === "i-text" || obj?.type === "text";
}

function rgbComponentToHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function parseCanvasColor(color?: string): { hex: string; alpha: number } | null {
  if (!color || typeof color !== "string") return null;
  const normalized = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return { hex: normalized as DrawColor, alpha: 1 };
  }

  const shortHexMatch = normalized.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    const expanded = `#${shortHexMatch[1].split("").map((char) => char + char).join("")}`;
    return { hex: expanded, alpha: 1 };
  }

  const rgbaMatch = normalized.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbaMatch) return null;
  const parts = rgbaMatch[1].split(",").map((part) => part.trim());
  if (parts.length < 3) return null;
  const [r, g, b] = parts.slice(0, 3).map((part) => Number(part));
  if (![r, g, b].every((part) => Number.isFinite(part))) return null;
  const alpha = parts[3] !== undefined ? Number(parts[3]) : 1;
  return {
    hex: `#${rgbComponentToHex(r)}${rgbComponentToHex(g)}${rgbComponentToHex(b)}`,
    alpha: Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1,
  };
}

function toEditorColor(color?: string): DrawColor | null {
  const parsed = parseCanvasColor(color);
  if (!parsed) return null;
  return EDITOR_COLORS.includes(parsed.hex as DrawColor) ? (parsed.hex as DrawColor) : null;
}

function fitTextObjectToBounds(obj: any, fallbackFontSize: number) {
  if (!obj) return;
  const baseFontSize = Number((obj as any).pdfxBaseFontSize ?? obj.fontSize ?? fallbackFontSize);
  const maxWidth = Number((obj as any).pdfxMaxWidth ?? obj.width ?? 0);
  if (!(Number.isFinite(maxWidth) && maxWidth > 24)) return;
  const autoWidth = Boolean((obj as any).pdfxAutoWidth);

  const text = typeof obj.text === "string" ? obj.text : "";
  obj.set({
    fontSize: baseFontSize,
  });
  if (!autoWidth) {
    obj.set({ width: maxWidth });
  }
  obj.initDimensions?.();

  if (text.trim()) {
    if (!text.includes("\n")) {
      const measuredWidth = typeof obj.calcTextWidth === "function"
        ? obj.calcTextWidth()
        : (obj.width ?? maxWidth);
      if (measuredWidth > maxWidth) {
        obj.set({
          fontSize: Math.max(8, Math.round(baseFontSize * (maxWidth / measuredWidth) * 10) / 10),
        });
        obj.initDimensions?.();
      }
      const nextMeasuredWidth = typeof obj.calcTextWidth === "function"
        ? obj.calcTextWidth()
        : measuredWidth;
      if (autoWidth) {
        obj.set({
          width: clamp(nextMeasuredWidth + Math.max(6, obj.fontSize * 0.35), 18, maxWidth),
        });
      }
    } else {
      const dynamicMinWidth = Number(obj.dynamicMinWidth ?? 0);
      if (Number.isFinite(dynamicMinWidth) && dynamicMinWidth > maxWidth) {
        obj.set({
          fontSize: Math.max(8, Math.round(baseFontSize * (maxWidth / dynamicMinWidth) * 10) / 10),
        });
        obj.initDimensions?.();
      }
      if (autoWidth) {
        const nextDynamicMinWidth = Number(obj.dynamicMinWidth ?? 0);
        if (Number.isFinite(nextDynamicMinWidth) && nextDynamicMinWidth > 0) {
          obj.set({
            width: clamp(nextDynamicMinWidth + Math.max(6, obj.fontSize * 0.35), 18, maxWidth),
          });
        }
      }
    }
  }

  if (!text.trim() && autoWidth) {
    obj.set({ width: Math.min(Math.max(baseFontSize * 0.9, 18), maxWidth) });
  } else if (!autoWidth) {
    obj.set({ width: maxWidth });
  }
  if (typeof obj.minHeight === "number" && obj.minHeight > 0) {
    obj.set({ height: Math.max(obj.height ?? 0, obj.minHeight) });
  }
  if (typeof (obj as any).pdfxBaseTop === "number") {
    obj.set({ top: (obj as any).pdfxBaseTop });
  }
}

function buildEditorFontString(editor: Pick<ActiveTextEditor, "fontStyle" | "fontWeight" | "fontSize" | "fontFamily">) {
  return `${editor.fontStyle} ${editor.fontWeight} ${editor.fontSize}px "${editor.fontFamily}"`;
}

function measureEditorTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  editor: Pick<ActiveTextEditor, "fontStyle" | "fontWeight" | "fontSize" | "fontFamily">
) {
  ctx.font = buildEditorFontString(editor);
  const lines = text.split("\n");
  const widestLine = lines.reduce((max, line) => Math.max(max, ctx.measureText(line || " ").width), 0);
  return widestLine;
}

function measureEditorTextMetrics(
  ctx: CanvasRenderingContext2D,
  editor: Pick<ActiveTextEditor, "fontStyle" | "fontWeight" | "fontSize" | "fontFamily">,
  lineHeightHint?: number
) {
  ctx.font = buildEditorFontString(editor);
  const metrics = ctx.measureText("Hg");
  const fontBoxAscent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || editor.fontSize * 0.8;
  const fontBoxDescent = metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || editor.fontSize * 0.2;
  const actualAscent = metrics.actualBoundingBoxAscent || fontBoxAscent;
  const actualDescent = metrics.actualBoundingBoxDescent || fontBoxDescent;
  const fontBoxHeight = Math.max(1, fontBoxAscent + fontBoxDescent);
  const lineHeight = Math.max(
    Math.ceil(lineHeightHint ?? 0),
    Math.ceil(fontBoxHeight),
    Math.ceil(editor.fontSize * 1.05),
    18
  );
  const baselineFromTop = (lineHeight - fontBoxHeight) / 2 + fontBoxAscent;

  return {
    lineHeight,
    baselineFromTop,
    actualAscent,
    actualDescent,
    fontBoxHeight,
  };
}

function normalizePdfFontFamily(fontFamily?: string, fontName?: string) {
  const familyCandidate = (fontFamily ?? "")
    .split(",")[0]
    .replace(/^[/]+/, "")
    .replace(/[+]/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedCandidate = familyCandidate
    .replace(/\b(mt|ps|std|identity|cid)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalizedCandidate &&
    /^[a-z0-9 .]+$/i.test(normalizedCandidate) &&
    !/^(sans|serif|monospace)$/i.test(normalizedCandidate) &&
    !DISALLOWED_FONT_FAMILIES.has(normalizedCandidate)
  ) {
    return normalizeEditorFontFamily(normalizedCandidate);
  }

  const source = `${fontFamily ?? ""} ${fontName ?? ""}`.toLowerCase();
  if (source.includes("calibri")) return "Calibri";
  if (source.includes("cambria")) return "Cambria";
  if (source.includes("garamond")) return "Garamond";
  if (source.includes("mono") || source.includes("courier")) return "Courier New";
  if (source.includes("helvetica") || source.includes("arial") || source.includes("sans")) return "Arial";
  if (source.includes("times") || source.includes("georgia") || source.includes("serif")) return "Times New Roman";
  return "Times New Roman";
}

function getFontTraits(fontName?: string, fontFamily?: string) {
  const source = `${fontName ?? ""} ${fontFamily ?? ""}`.toLowerCase();
  return {
    fontWeight: (source.includes("bold") ? "bold" : "normal") as "normal" | "bold",
    fontStyle: (
      source.includes("italic") || source.includes("oblique")
        ? "italic"
        : "normal"
    ) as "normal" | "italic",
  };
}

function splitTextIntoSegments(
  text: string,
  left: number,
  width: number,
  top: number,
  bottom: number,
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: "normal" | "bold";
    fontStyle: "normal" | "italic";
  }
): TextSegmentMetric[] {
  const matches: Array<{ index: number; value: string }> = [];
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    matches.push({ index: match.index, value: match[0] });
  }
  const baseHeight = Math.max(bottom - top, 1);

  if (matches.length <= 1 || text.length <= 1 || width <= 1) {
    const normalizedText = text.trim();
    if (!normalizedText) return [];
    return [{
      top,
      bottom,
      left,
      right: left + width,
      centerY: (top + bottom) / 2,
      height: baseHeight,
      text: normalizedText,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
    }];
  }

  return matches.map((match) => {
    const startIndex = match.index;
    const endIndex = startIndex + match.value.length;
    const segmentLeft = left + (width * startIndex) / text.length;
    const segmentRight = left + (width * endIndex) / text.length;
    return {
      top,
      bottom,
      left: segmentLeft,
      right: segmentRight,
      centerY: (top + bottom) / 2,
      height: baseHeight,
      text: match.value,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
    };
  });
}

async function extractTextLines(page: any, scale: number): Promise<TextLineMetric[]> {
  try {
    const textContent = await page.getTextContent();
    const styles = textContent.styles ?? {};
    const viewport = page.getViewport({ scale });
    const lines: TextLineMetric[] = [];

    for (const item of textContent.items ?? []) {
      if (!item?.transform || typeof item.str !== "string" || !item.str.trim()) continue;

      const [, , , , tx, ty] = item.transform;
      const [x, y] = viewport.convertToViewportPoint(tx, ty);
      const width = Math.max(1, (item.width || 0) * scale);
      const height = Math.max(10, Math.abs((item.height || item.transform[3] || 0) * scale));
      const top = y - height;
      const bottom = y;
      const centerY = (top + bottom) / 2;
      const tolerance = Math.max(6, height * 0.55);
      const styleRef = styles[item.fontName] ?? {};
      const { fontWeight, fontStyle } = getFontTraits(item.fontName, styleRef.fontFamily);
      const fontSize = Math.max(10, height * 0.92);
      const fontFamily = normalizePdfFontFamily(styleRef.fontFamily, item.fontName);
      const segments = splitTextIntoSegments(item.str, x, width, top, bottom, {
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
      });

      const existing = lines.find((line) => Math.abs(line.centerY - centerY) <= tolerance);
      if (existing) {
        existing.top = Math.min(existing.top, top);
        existing.bottom = Math.max(existing.bottom, bottom);
        existing.left = Math.min(existing.left, x);
        existing.right = Math.max(existing.right, x + width);
        existing.text = `${existing.text} ${item.str}`.replace(/\s+/g, " ").trim();
        existing.segments.push(...segments);
        existing.height = existing.bottom - existing.top;
        existing.centerY = (existing.top + existing.bottom) / 2;
        if (width >= (existing.right - existing.left) * 0.4) {
          existing.fontFamily = fontFamily;
          existing.fontSize = fontSize;
          existing.fontWeight = fontWeight;
          existing.fontStyle = fontStyle;
        }
      } else {
        lines.push({
          top,
          bottom,
          left: x,
          right: x + width,
          centerY,
          height: bottom - top,
          text: item.str.trim(),
          segments,
          fontFamily,
          fontSize,
          fontWeight,
          fontStyle,
        });
      }
    }

    return lines
      .map((line) => ({
        ...line,
        segments: line.segments.sort((a, b) => a.left - b.left),
      }))
      .sort((a, b) => a.top - b.top);
  } catch {
    return [];
  }
}

function findNearestTextLine(lines: TextLineMetric[], x: number, y: number, maxScore = 40): TextLineMetric | null {
  let best: TextLineMetric | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const line of lines) {
    const verticalDistance = Math.abs(line.centerY - y);
    const horizontalOverflow =
      x < line.left ? line.left - x :
      x > line.right ? x - line.right :
      0;
    const score = verticalDistance + horizontalOverflow * 0.2;
    if (score < bestScore) {
      best = line;
      bestScore = score;
    }
  }

  return bestScore <= maxScore ? best : null;
}

function findNearestTextSegment(line: TextLineMetric, x: number): TextSegmentMetric | null {
  if (!line.segments.length) return null;

  let best: TextSegmentMetric | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const segment of line.segments) {
    const distance =
      x < segment.left ? segment.left - x :
      x > segment.right ? x - segment.right :
      0;
    const score = distance + Math.abs(((segment.left + segment.right) / 2) - x) * 0.05;
    if (score < bestScore) {
      best = segment;
      bestScore = score;
    }
  }

  return best;
}

function estimateLineCaretIndex(line: TextLineMetric, x: number) {
  const text = line.text ?? "";
  if (!text) return 0;
  const ratio = clamp((x - line.left) / Math.max(1, line.right - line.left), 0, 1);
  return clamp(Math.round(text.length * ratio), 0, text.length);
}

function getHighlightPadding(size: number) {
  return {
    x: 2,
    y: clamp(Math.round(size / 2), 2, 7),
  };
}

function clampHighlightX(line: TextLineMetric, x: number, paddingX = 2) {
  return clamp(x, line.left - paddingX, line.right + paddingX);
}

function resolveHighlightEndLine(
  lines: TextLineMetric[],
  startLine: TextLineMetric | null,
  pointer: { x: number; y: number }
) {
  if (!startLine) {
    return findNearestTextLine(lines, pointer.x, pointer.y, 32);
  }

  const verticalDistance = Math.abs(pointer.y - startLine.centerY);
  const sameLineThreshold = Math.max(14, startLine.height * 0.7);
  if (verticalDistance <= sameLineThreshold) {
    return startLine;
  }

  return findNearestTextLine(lines, pointer.x, pointer.y, Math.max(28, startLine.height * 1.6));
}

function resolveTextInsertionStyle(
  lines: TextLineMetric[],
  pointer: { x: number; y: number },
  fallback: Pick<TextInsertionStyle, "fontFamily" | "fontSize" | "fontWeight" | "fontStyle">
): TextInsertionStyle {
  const line = findNearestTextLine(lines, pointer.x, pointer.y, 34);
  const segment = line ? findNearestTextSegment(line, pointer.x) : null;
  const styleSource = segment ?? line;
  const fontSize = styleSource?.fontSize ?? fallback.fontSize;
  const insertionLeft = segment
    ? clamp(pointer.x, segment.left, segment.right)
    : line
      ? clamp(pointer.x, line.left, line.right)
      : pointer.x;
  const rightBound = line?.right ?? (insertionLeft + Math.max(fontSize * 12, 220));
  const top = line
    ? line.bottom - fontSize * 0.82
    : pointer.y - fontSize * 0.5;

  return {
    left: insertionLeft,
    top,
    maxWidth: Math.max(rightBound - insertionLeft + fontSize * 0.35, Math.max(fontSize * 4.5, 72)),
    fontFamily: styleSource?.fontFamily ?? fallback.fontFamily,
    fontSize,
    fontWeight: styleSource?.fontWeight ?? fallback.fontWeight,
    fontStyle: styleSource?.fontStyle ?? fallback.fontStyle,
  };
}

function resolveHighlightRange(
  line: TextLineMetric,
  fromX: number,
  toX: number,
  paddingX: number
) {
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);
  const overlapping = line.segments.filter(
    (segment) => segment.right >= minX && segment.left <= maxX
  );

  if (overlapping.length > 0) {
    return {
      left: clampHighlightX(line, overlapping[0].left - paddingX, paddingX),
      right: clampHighlightX(line, overlapping[overlapping.length - 1].right + paddingX, paddingX),
    };
  }

  const startSegment = findNearestTextSegment(line, fromX);
  const endSegment = findNearestTextSegment(line, toX);
  if (startSegment && endSegment) {
    return {
      left: clampHighlightX(
        line,
        Math.min(startSegment.left, endSegment.left) - paddingX,
        paddingX
      ),
      right: clampHighlightX(
        line,
        Math.max(startSegment.right, endSegment.right) + paddingX,
        paddingX
      ),
    };
  }

  return {
    left: clampHighlightX(line, minX, paddingX),
    right: clampHighlightX(line, maxX, paddingX),
  };
}

function buildHighlightRectMetrics(
  lines: TextLineMetric[],
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  startLine: TextLineMetric,
  endLine: TextLineMetric,
  paddingX = 2,
  paddingY = 3
) {
  const startIndex = lines.findIndex((line) => line === startLine);
  const endIndex = lines.findIndex((line) => line === endLine);

  if (startIndex === -1 || endIndex === -1) return [];

  const startComesFirst =
    startIndex < endIndex ||
    (startIndex === endIndex && startPoint.x <= endPoint.x);

  const firstIndex = startComesFirst ? startIndex : endIndex;
  const lastIndex = startComesFirst ? endIndex : startIndex;
  const firstPoint = startComesFirst ? startPoint : endPoint;
  const lastPoint = startComesFirst ? endPoint : startPoint;
  const firstLine = lines[firstIndex];
  const lastLine = lines[lastIndex];

  const rects: Array<{ left: number; top: number; width: number; height: number }> = [];
  for (let index = firstIndex; index <= lastIndex; index++) {
    const line = lines[index];
    const top = line.top - paddingY;
    const height = line.height + paddingY * 2;
    let left = line.left - paddingX;
    let right = line.right + paddingX;

    if (firstIndex === lastIndex) {
      const range = resolveHighlightRange(line, firstPoint.x, lastPoint.x, paddingX);
      left = range.left;
      right = range.right;
    } else if (index === firstIndex) {
      const range = resolveHighlightRange(firstLine, firstPoint.x, firstLine.right, paddingX);
      left = range.left;
    } else if (index === lastIndex) {
      const range = resolveHighlightRange(lastLine, lastLine.left, lastPoint.x, paddingX);
      right = range.right;
    }

    rects.push({
      left,
      top,
      width: Math.max(right - left, 12),
      height: Math.max(height, 12),
    });
  }

  return rects;
}

export default function EditPdfPage() {
  const [, setLocation] = useLocation();
  const { lang } = useLang();
  const isRu = lang === "ru";

  useSeo({
    title: isRu ? "Редактировать PDF — PDFX" : "Edit PDF — PDFX",
    description: isRu
      ? "Добавляйте текст, рисунки, изображения и подписи к PDF прямо в браузере. Файл не покидает ваш компьютер."
      : "Add text, drawings, images and signatures to PDF directly in the browser. No upload to server.",
  });

  const [file, setFile] = useState<File | null>(null);
  const [pdfjsDoc, setPdfjsDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pageDims, setPageDims] = useState<PageDims[]>([]);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "ready">("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [zoom, setZoom] = useState(1);
  const [drawColor, setDrawColor] = useState<DrawColor>("#1a1a1a");
  const [brushSize, setBrushSize] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState<(typeof EDITOR_FONT_FAMILIES)[number]>("Arial");
  const [fontColor, setFontColor] = useState("#1a1a1a");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<TextAlignOption>("left");
  const [highlightOpacity, setHighlightOpacity] = useState(0.28);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [hasClipboardObject, setHasClipboardObject] = useState(false);
  const [selectionToolContext, setSelectionToolContext] = useState<"text" | "stroke" | "highlight" | null>(null);
  const [activeTextEditor, setActiveTextEditor] = useState<ActiveTextEditor | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricElRef = useRef<HTMLCanvasElement>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);
  const textMeasureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<any>(null); // fabric.Canvas instance
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const pageStatesRef = useRef<Map<number, string>>(new Map());
  const pageTextLinesRef = useRef<Map<number, TextLineMetric[]>>(new Map());
  const pageOrigBytesRef = useRef<ArrayBuffer | null>(null);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const signFabricRef = useRef<any>(null);
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const activeToolRef = useRef<ToolType>("select");
  const drawColorRef = useRef<DrawColor>("#1a1a1a");
  const brushSizeRef = useRef(3);
  const fontSizeRef = useRef(16);
  const fontFamilyRef = useRef<(typeof EDITOR_FONT_FAMILIES)[number]>("Arial");
  const fontColorRef = useRef("#1a1a1a");
  const textBoldRef = useRef(false);
  const textItalicRef = useRef(false);
  const textUnderlineRef = useRef(false);
  const textAlignRef = useRef<TextAlignOption>("left");
  const highlightOpacityRef = useRef(0.28);
  const suppressHistoryRef = useRef(false);
  const selectionToolbarSyncRef = useRef(false);
  const clipboardRef = useRef<any>(null);
  const renderQueueRef = useRef<Promise<void>>(Promise.resolve());
  const renderVersionRef = useRef(0);
  const initVersionRef = useRef(0);
  const draftObjectRef = useRef<any>(null);
  const draftStartRef = useRef<{ x: number; y: number } | null>(null);
  const draftLineRef = useRef<TextLineMetric | null>(null);
  const activeTextEditorRef = useRef<ActiveTextEditor | null>(null);
  const syncToolbarFromObjectRef = useRef<(obj: any) => void>(() => {});
  const [, setHistoryVersion] = useState(0);

  const t = {
    title: isRu ? "Редактировать PDF" : "Edit PDF",
    upload: isRu ? "Перетащите PDF сюда или" : "Drop PDF here or",
    choose: isRu ? "Выберите файл" : "Choose file",
    limit: isRu ? `Макс. ${MAX_EDIT_PDF_FILE_SIZE_MB} МБ` : `Max ${MAX_EDIT_PDF_FILE_SIZE_MB} MB`,
    save: isRu ? "Скачать PDF" : "Download PDF",
    saving: isRu ? "Сохранение…" : "Saving…",
    undo: isRu ? "Отменить" : "Undo",
    redo: isRu ? "Повторить" : "Redo",
    tools: {
      select: isRu ? "Выбор" : "Select",
      text: isRu ? "Текст" : "Text",
      draw: isRu ? "Рисование" : "Draw",
      image: isRu ? "Изображение" : "Image",
      sign: isRu ? "Подпись" : "Signature",
      rect: isRu ? "Прямоугольник" : "Rectangle",
      circle: isRu ? "Круг" : "Circle",
      line: isRu ? "Линия" : "Line",
      highlight: isRu ? "Маркер" : "Highlight",
      eraser: isRu ? "Ластик" : "Eraser",
    },
    page: isRu ? "стр." : "p.",
    howToUse: isRu ? "Как использовать" : "How to use",
    steps: isRu ? [
      "Загрузите PDF файл",
      "Выберите инструмент в тулбаре",
      "Редактируйте страницы",
      "Нажмите «Скачать PDF»",
    ] : [
      "Upload your PDF file",
      "Select a tool from the toolbar",
      "Edit pages as needed",
      "Click «Download PDF»",
    ],
    signTitle: isRu ? "Нарисуйте подпись" : "Draw your signature",
    signClear: isRu ? "Очистить" : "Clear",
    signConfirm: isRu ? "Добавить" : "Add",
    eraseHint: isRu ? "Кликните на объект чтобы удалить" : "Click an object to delete it",
  };

  const pushHistory = useCallback(() => {
    if (!fabricRef.current || suppressHistoryRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    const hist = historyRef.current;
    const idx = historyIndexRef.current;
    if (idx >= 0 && hist[idx] === json) return;
    const newHist = hist.slice(0, idx + 1);
    newHist.push(json);
    if (newHist.length > 50) newHist.shift();
    historyRef.current = newHist;
    historyIndexRef.current = newHist.length - 1;
    setHistoryVersion((prev) => prev + 1);
  }, []);

  const updateSelectedObjects = useCallback((updater: (obj: any) => void) => {
    if (!fabricRef.current) return false;
    const activeObjects = fabricRef.current.getActiveObjects?.() || [];
    if (activeObjects.length === 0) return false;

    activeObjects.forEach((obj: any) => {
      updater(obj);
      obj.setCoords?.();
    });
    fabricRef.current.requestRenderAll?.();
    setHasUnsavedChanges(true);
    pushHistory();
    return true;
  }, [pushHistory]);

  const getTextMeasureContext = useCallback(() => {
    if (!textMeasureCanvasRef.current) {
      textMeasureCanvasRef.current = document.createElement("canvas");
    }
    return textMeasureCanvasRef.current.getContext("2d");
  }, []);

  const openTextObjectEditor = useCallback((pageNumber: number, obj: any) => {
    if (!obj || !fabricRef.current) return;
    const fontSize = Number(obj.fontSize ?? fontSizeRef.current ?? 16);
    const maxWidth = Number((obj as any).pdfxMaxWidth ?? obj.width ?? Math.max(fontSize * 12, 220));
    const width = clamp(
      Number(obj.width ?? obj.getScaledWidth?.() ?? Math.max(fontSize * 0.9, 18)),
      18,
      Math.max(18, maxWidth)
    );
    const editorSeed = {
      fontFamily: normalizeEditorFontFamily(obj.fontFamily ?? fontFamilyRef.current),
      fontSize,
      fontWeight: obj.fontWeight === "bold" ? "bold" as const : "normal" as const,
      fontStyle: obj.fontStyle === "italic" ? "italic" as const : "normal" as const,
    };
    const ctx = getTextMeasureContext();
    const lineHeightHint = Number((obj as any).pdfxBaseLineHeight ?? obj.minHeight ?? (obj.lineHeight ?? 1) * fontSize);
    const textMetrics = ctx
      ? measureEditorTextMetrics(ctx, editorSeed, lineHeightHint)
      : { lineHeight: Math.max(Math.round(fontSize * 1.1), 18), baselineFromTop: fontSize * 0.82 };
    const minHeight = Math.max(Number(obj.minHeight ?? 0), textMetrics.lineHeight, 18);
    const baselineY = Number((obj as any).pdfxBaselineY ?? (Number((obj as any).pdfxBaseTop ?? obj.top ?? 0) + textMetrics.baselineFromTop));

    obj.set({
      visible: false,
      evented: false,
      selectable: false,
    });
    fabricRef.current.discardActiveObject?.();
    fabricRef.current.requestRenderAll?.();

    setActiveTextEditor({
      pageNumber,
      left: Number(obj.left ?? 0),
      top: baselineY - textMetrics.baselineFromTop,
      baselineY,
      width,
      maxWidth: Math.max(18, maxWidth),
      minHeight,
      lineHeight: textMetrics.lineHeight,
      fontFamily: editorSeed.fontFamily,
      fontSize,
      fontWeight: editorSeed.fontWeight,
      fontStyle: editorSeed.fontStyle,
      underline: Boolean(obj.underline),
      textAlign: (obj.textAlign as TextAlignOption) ?? "left",
      color: typeof obj.fill === "string" ? obj.fill : fontColorRef.current,
      backgroundColor: typeof obj.backgroundColor === "string" ? obj.backgroundColor : "transparent",
      text: typeof obj.text === "string" ? obj.text : "",
      sourceObject: obj,
    });
  }, [getTextMeasureContext]);

  const beginTextEditor = useCallback((pageNumber: number, pointer: { x: number; y: number }) => {
    const currentLines = pageTextLinesRef.current.get(pageNumber) || [];
    const insertionStyle = resolveTextInsertionStyle(currentLines, pointer, {
      fontFamily: fontFamilyRef.current,
      fontSize: fontSizeRef.current,
      fontWeight: textBoldRef.current ? "bold" : "normal",
      fontStyle: textItalicRef.current ? "italic" : "normal",
    });
    const nearestLine = findNearestTextLine(currentLines, pointer.x, pointer.y, 28);
    const fontFamily = normalizeEditorFontFamily(nearestLine ? insertionStyle.fontFamily : fontFamilyRef.current);
    const fontSize = insertionStyle.fontSize;
    const ctx = getTextMeasureContext();
    const textMetrics = ctx
      ? measureEditorTextMetrics(ctx, {
          fontFamily,
          fontSize,
          fontWeight: textBoldRef.current ? "bold" : insertionStyle.fontWeight,
          fontStyle: textItalicRef.current ? "italic" : insertionStyle.fontStyle,
        }, nearestLine?.height)
      : { lineHeight: Math.max(Math.round(fontSize * 1.1), nearestLine?.height ?? 0, 18), baselineFromTop: fontSize * 0.82 };
    const lineHeight = textMetrics.lineHeight;
    const minHeight = lineHeight;
    const baselineY = nearestLine
      ? nearestLine.bottom
      : insertionStyle.top + textMetrics.baselineFromTop;
    const top = baselineY - textMetrics.baselineFromTop;
    const maxWidth = insertionStyle.maxWidth;

    setActiveTextEditor({
      pageNumber,
      left: insertionStyle.left,
      top,
      baselineY,
      width: Math.min(Math.max(fontSize * 0.9, 18), maxWidth),
      maxWidth,
      minHeight,
      lineHeight,
      fontFamily,
      fontSize,
      fontWeight: textBoldRef.current ? "bold" : insertionStyle.fontWeight,
      fontStyle: textItalicRef.current ? "italic" : insertionStyle.fontStyle,
      underline: textUnderlineRef.current,
      textAlign: textAlignRef.current,
      color: fontColorRef.current,
      backgroundColor: nearestLine ? "#ffffff" : "transparent",
      text: "",
      sourceObject: null,
    });
  }, [getTextMeasureContext, setActiveTextEditor]);

  const commitTextEditor = useCallback(async () => {
    const editor = activeTextEditorRef.current;
    if (!editor || !fabricRef.current || editor.pageNumber !== currentPage) {
      setActiveTextEditor(null);
      return false;
    }

    const text = editor.text.trim();
    if (!text) {
      if (editor.sourceObject && fabricRef.current) {
        fabricRef.current.remove(editor.sourceObject);
        fabricRef.current.requestRenderAll?.();
        setHasSelection(false);
      }
      setActiveTextEditor(null);
      return false;
    }

    const ctx = getTextMeasureContext();
    const textMetrics = ctx
      ? measureEditorTextMetrics(ctx, editor, editor.lineHeight)
      : { lineHeight: editor.lineHeight, baselineFromTop: editor.fontSize * 0.82 };
    const normalizedTop = (editor.baselineY ?? (editor.top + textMetrics.baselineFromTop)) - textMetrics.baselineFromTop;
    const lineHeightMultiplier = Math.max(1, textMetrics.lineHeight / Math.max(editor.fontSize, 1));
    let obj = editor.sourceObject;
    if (!obj) {
      const { Textbox } = await import("fabric");
      obj = new Textbox(text, {
        left: editor.left,
        top: normalizedTop,
        fontSize: editor.fontSize,
        fill: editor.color,
        fontFamily: editor.fontFamily,
        fontWeight: editor.fontWeight,
        fontStyle: editor.fontStyle,
        underline: editor.underline,
        textAlign: editor.textAlign,
        editable: false,
        lineHeight: lineHeightMultiplier,
        width: editor.width,
        padding: 0,
        backgroundColor: editor.backgroundColor,
      });
      fabricRef.current.add(obj);
    }
    obj.set({
      text,
      left: editor.left,
      top: normalizedTop,
      fontSize: editor.fontSize,
      fill: editor.color,
      fontFamily: editor.fontFamily,
      fontWeight: editor.fontWeight,
      fontStyle: editor.fontStyle,
      underline: editor.underline,
      textAlign: editor.textAlign,
      editable: false,
      lineHeight: lineHeightMultiplier,
      width: editor.width,
      padding: 0,
      backgroundColor: editor.backgroundColor,
      visible: true,
      evented: true,
      selectable: true,
    });
    (obj as any).pdfxBaseFontSize = editor.fontSize;
    (obj as any).pdfxMaxWidth = editor.maxWidth;
    (obj as any).pdfxBaseTop = normalizedTop;
    (obj as any).pdfxBaseLineHeight = textMetrics.lineHeight;
    (obj as any).pdfxBaselineY = editor.baselineY ?? (normalizedTop + textMetrics.baselineFromTop);
    (obj as any).pdfxAutoWidth = true;
    obj.minHeight = textMetrics.lineHeight;
    fitTextObjectToBounds(obj, editor.fontSize);
    try {
      fabricRef.current.setActiveObject?.(obj);
    } catch {
      // Ignore transient activation errors.
    }
    fabricRef.current.requestRenderAll?.();
    setHasSelection(true);
    setHasUnsavedChanges(true);
    syncToolbarFromObjectRef.current(obj);
    setActiveTextEditor(null);
    return true;
  }, [currentPage]);

  const cancelTextEditor = useCallback(() => {
    const editor = activeTextEditorRef.current;
    if (editor?.sourceObject) {
      editor.sourceObject.set({
        visible: true,
        evented: true,
        selectable: true,
      });
      fabricRef.current?.setActiveObject?.(editor.sourceObject);
      fabricRef.current?.requestRenderAll?.();
    }
    setActiveTextEditor(null);
  }, []);

  const syncToolbarFromObject = useCallback((obj: any) => {
    const target = obj?.type === "activeSelection" && typeof obj.getObjects === "function"
      ? obj.getObjects()[0]
      : obj;
    if (!target) return;

    selectionToolbarSyncRef.current = true;

    const releaseSync = () => {
      window.setTimeout(() => {
        selectionToolbarSyncRef.current = false;
      }, 0);
    };

    try {
      if (target.type === "textbox" || target.type === "i-text" || target.type === "text") {
        setSelectionToolContext("text");
        const nextFontFamily = normalizeEditorFontFamily(target.fontFamily);
        if (EDITOR_FONT_FAMILIES.includes(nextFontFamily as (typeof EDITOR_FONT_FAMILIES)[number])) {
          setFontFamily(nextFontFamily as (typeof EDITOR_FONT_FAMILIES)[number]);
        }
        if (typeof target.fill === "string") {
          setFontColor(target.fill);
        }
        const nextFontSize = Number((target as any).pdfxBaseFontSize ?? target.fontSize ?? fontSizeRef.current);
        if (Number.isFinite(nextFontSize)) {
          setFontSize(Math.round(nextFontSize));
        }
        setTextBold(target.fontWeight === "bold");
        setTextItalic(target.fontStyle === "italic");
        setTextUnderline(Boolean(target.underline));
        setTextAlign((target.textAlign ?? "left") as TextAlignOption);
      } else if (target.type === "line") {
        setSelectionToolContext("stroke");
        const nextColor = toEditorColor(target.stroke);
        if (nextColor) setDrawColor(nextColor);
        const nextSize = Number(target.strokeWidth ?? brushSizeRef.current);
        if (Number.isFinite(nextSize)) {
          setBrushSize(clamp(Math.round(nextSize), 1, 24));
        }
      } else if (target.type === "ellipse" || (target.type === "rect" && target.stroke !== "transparent")) {
        setSelectionToolContext("stroke");
        const nextColor = toEditorColor(target.stroke);
        if (nextColor) setDrawColor(nextColor);
        const nextSize = Number(target.strokeWidth ?? brushSizeRef.current);
        if (Number.isFinite(nextSize)) {
          setBrushSize(clamp(Math.round(nextSize), 1, 24));
        }
      } else if (target.type === "rect" && target.stroke === "transparent") {
        setSelectionToolContext("highlight");
        const parsed = parseCanvasColor(target.fill);
        const nextColor = toEditorColor(parsed?.hex);
        if (nextColor) setDrawColor(nextColor);
        if (parsed) setHighlightOpacity(parsed.alpha);
      } else if (target.type === "group" && typeof target.getObjects === "function") {
        setSelectionToolContext("highlight");
        const child = target.getObjects().find((item: any) => item.type === "rect");
        const parsed = parseCanvasColor(child?.fill);
        const nextColor = toEditorColor(parsed?.hex);
        if (nextColor) setDrawColor(nextColor);
        if (parsed) setHighlightOpacity(parsed.alpha);
      } else {
        setSelectionToolContext(null);
      }
    } finally {
      releaseSync();
    }
  }, []);

  useEffect(() => {
    syncToolbarFromObjectRef.current = syncToolbarFromObject;
  }, [syncToolbarFromObject]);

  const getCanvasSize = useCallback((pageNumber: number) => {
    const dim = pageDims[pageNumber - 1] || { width: 595, height: 842 };
    return {
      width: Math.round(dim.width * DISPLAY_SCALE),
      height: Math.round(dim.height * DISPLAY_SCALE),
    };
  }, [pageDims]);

  const applyCanvasCssSize = useCallback((width: number, height: number) => {
    const renderedWidth = Math.round(width * zoom);
    const renderedHeight = Math.round(height * zoom);

    if (pdfCanvasRef.current) {
      pdfCanvasRef.current.style.width = `${renderedWidth}px`;
      pdfCanvasRef.current.style.height = `${renderedHeight}px`;
    }

    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width: renderedWidth, height: renderedHeight }, { cssOnly: true });
      fabricRef.current.calcOffset?.();
      fabricRef.current.requestRenderAll?.();
    } else if (fabricElRef.current) {
      fabricElRef.current.style.width = `${renderedWidth}px`;
      fabricElRef.current.style.height = `${renderedHeight}px`;
    }
  }, [zoom]);

  const loadCanvasState = useCallback(async (canvas: any, state: string) => {
    suppressHistoryRef.current = true;
    try {
      await canvas.loadFromJSON(JSON.parse(state));
      canvas.renderAll();
    } finally {
      suppressHistoryRef.current = false;
    }
  }, []);

  const initFabric = useCallback(async (pageNumber: number) => {
    if (!fabricElRef.current) return;
    const version = ++initVersionRef.current;
    const {
      Canvas: FabricCanvas,
      FabricObject,
      PencilBrush,
      Textbox,
      Rect,
      Ellipse,
      Line,
      Group,
    } = await import("fabric");
    const IText = Textbox;
    FabricObject.customProperties = Array.from(new Set([
      ...(FabricObject.customProperties ?? []),
      ...PDFX_TEXT_CUSTOM_PROPS,
    ]));
    Textbox.customProperties = Array.from(new Set([
      ...(Textbox.customProperties ?? []),
      ...PDFX_TEXT_CUSTOM_PROPS,
    ]));
    if (version !== initVersionRef.current) return;
    const { width, height } = getCanvasSize(pageNumber);
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }
    const fc = new FabricCanvas(fabricElRef.current, {
      selection: true,
      backgroundColor: "",
      width,
      height,
    });
    (fc as any)._pdfxPencilBrush = new PencilBrush(fc);
    fabricRef.current = fc;
    applyCanvasCssSize(width, height);
    historyRef.current = [];
    historyIndexRef.current = -1;
    setHasSelection(false);
    setSelectionToolContext(null);
    setHistoryVersion((prev) => prev + 1);

    fc.on("object:added", pushHistory);
    fc.on("object:modified", pushHistory);
    fc.on("object:removed", pushHistory);
    fc.on("object:added", () => {
      if (!suppressHistoryRef.current) setHasUnsavedChanges(true);
    });
    fc.on("object:modified", () => {
      if (!suppressHistoryRef.current) setHasUnsavedChanges(true);
    });
    fc.on("object:removed", () => {
      if (!suppressHistoryRef.current) {
        setHasUnsavedChanges(true);
        setHasSelection(false);
      }
    });
    fc.on("selection:created", () => {
      setHasSelection(true);
      syncToolbarFromObject(fc.getActiveObject?.());
    });
    fc.on("selection:updated", () => {
      setHasSelection(true);
      syncToolbarFromObject(fc.getActiveObject?.());
    });
    fc.on("selection:cleared", () => {
      setHasSelection(false);
      setSelectionToolContext(null);
      selectionToolbarSyncRef.current = false;
    });
    fc.on("mouse:dblclick", (opt: any) => {
      if (!opt.target || !isEditableTextObject(opt.target)) return;
      if (activeToolRef.current !== "select" && activeToolRef.current !== "text") return;
      openTextObjectEditor(pageNumber, opt.target);
    });
    fc.on("text:changed", (opt: any) => {
      const obj = opt.target;
      if (!obj) return;

      if (obj.isEditing) {
        const maxWidth = Number((obj as any).pdfxMaxWidth ?? obj.width ?? 0);
        if (Number.isFinite(maxWidth) && maxWidth > 24) {
          const autoWidth = Boolean((obj as any).pdfxAutoWidth);
          if (autoWidth) {
            const text = typeof obj.text === "string" ? obj.text : "";
            const measuredWidth = text.trim() && typeof obj.calcTextWidth === "function"
              ? obj.calcTextWidth()
              : 0;
            obj.set({
              width: clamp(
                (measuredWidth || obj.fontSize || 16) + Math.max(6, (obj.fontSize || 16) * 0.35),
                18,
                maxWidth
              ),
            });
          } else {
            obj.set({ width: maxWidth });
          }
          obj.initDimensions?.();
        }
      } else {
        fitTextObjectToBounds(obj, fontSizeRef.current);
      }

      obj.setCoords?.();
      fc.requestRenderAll?.();
    });
    fc.on("text:editing:exited", (opt: any) => {
      const obj = opt.target;
      if (!obj) return;

      const text = typeof obj.text === "string" ? obj.text.trim() : "";
      if (!text) {
        suppressHistoryRef.current = true;
        try {
          fc.remove(obj);
          fc.discardActiveObject();
          setHasSelection(false);
        } finally {
          suppressHistoryRef.current = false;
        }
        fc.requestRenderAll?.();
        return;
      }

      fitTextObjectToBounds(obj, fontSizeRef.current);
      obj.setCoords?.();
      fc.setActiveObject(obj);
      fc.requestRenderAll?.();
      setHasUnsavedChanges(true);
      pushHistory();
      syncToolbarFromObject(obj);
    });
    fc.on("object:modified", () => syncToolbarFromObject(fc.getActiveObject?.()));
    fc.on("mouse:down", (opt: any) => {
      if (activeToolRef.current === "eraser" && opt.target) {
        fc.remove(opt.target);
        fc.discardActiveObject();
        fc.renderAll();
        return;
      }

      if (activeToolRef.current === "draw" || activeToolRef.current === "select") {
        return;
      }

      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e);
      if (!pointer) return;
      const currentLines = pageTextLinesRef.current.get(pageNumber) || [];

      if (activeToolRef.current === "text") {
        if (opt.target && isEditableTextObject(opt.target)) {
          openTextObjectEditor(pageNumber, opt.target);
          return;
        }
        fc.discardActiveObject?.();
        fc.requestRenderAll?.();
        beginTextEditor(pageNumber, pointer);
        return;
        const insertionStyle = resolveTextInsertionStyle(currentLines, pointer, {
          fontFamily: fontFamilyRef.current,
          fontSize: fontSizeRef.current,
          fontWeight: textBoldRef.current ? "bold" : "normal",
          fontStyle: textItalicRef.current ? "italic" : "normal",
        });
        const nearestLine = findNearestTextLine(currentLines, pointer.x, pointer.y, 26);
        const hasNearbyTextLine = Boolean(nearestLine);
        const measureText = hasNearbyTextLine ? "Hg" : "A";
        const initialText = hasNearbyTextLine ? " " : "";
        const initialSelectionEnd = hasNearbyTextLine ? 1 : 0;
        const textLeft = insertionStyle.left;
        const textWidth = insertionStyle.maxWidth;
        suppressHistoryRef.current = true;
        const obj = new IText(isRu ? "Текст" : "Text", {
          left: textLeft,
          top: insertionStyle.top,
          fontSize: insertionStyle.fontSize,
          fill: fontColorRef.current,
          fontFamily: hasNearbyTextLine
            ? normalizeEditorFontFamily(insertionStyle.fontFamily)
            : fontFamilyRef.current,
          fontWeight: textBoldRef.current ? "bold" : insertionStyle.fontWeight,
          fontStyle: textItalicRef.current ? "italic" : insertionStyle.fontStyle,
          underline: textUnderlineRef.current,
          textAlign: textAlignRef.current,
          editable: true,
          lineHeight: 1,
          width: Math.min(Math.max(insertionStyle.fontSize * 0.9, 18), textWidth),
          padding: 0,
          backgroundColor: hasNearbyTextLine ? "#ffffff" : "transparent",
        });
        obj.set("text", measureText);
        obj.initDimensions?.();
        const measuredHeight = obj.getScaledHeight?.() ?? obj.height ?? insertionStyle.fontSize;
        const textTop = hasNearbyTextLine
          ? ((nearestLine?.bottom ?? insertionStyle.top) - measuredHeight * 0.82)
          : insertionStyle.top;
        obj.set({ top: textTop, text: initialText, minHeight: measuredHeight });
        (obj as any).pdfxBaseFontSize = insertionStyle.fontSize;
        (obj as any).pdfxMaxWidth = textWidth;
        (obj as any).pdfxBaseTop = textTop;
        (obj as any).pdfxAutoWidth = hasNearbyTextLine;
        fc.add(obj);
        obj.setCoords?.();
        fc.requestRenderAll?.();
        window.setTimeout(() => {
          suppressHistoryRef.current = false;
          try {
            fc.setActiveObject?.(obj);
          } catch {
            // Fabric can transiently fail here during object bootstrap; editing still works.
          }
          fc.requestRenderAll?.();
          (obj as any).enterEditing?.();
          (obj as any).hiddenTextarea?.focus?.();
          (obj as any).selectionStart = 0;
          (obj as any).selectionEnd = initialSelectionEnd;
          (obj as any).hiddenTextarea?.setSelectionRange?.(0, initialSelectionEnd);
        }, 0);
        return;
      }

      if (opt.target) {
        return;
      }

      const snappedLine = activeToolRef.current === "highlight"
        ? findNearestTextLine(currentLines, pointer.x, pointer.y, 28)
        : null;

      draftStartRef.current = snappedLine
        ? { x: pointer.x, y: snappedLine.centerY }
        : pointer;
      draftLineRef.current = snappedLine;
      suppressHistoryRef.current = true;

      if (activeToolRef.current === "rect") {
        const obj = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: "transparent",
          stroke: drawColorRef.current,
          strokeWidth: Math.max(1, brushSizeRef.current),
          selectable: false,
          evented: false,
        });
        draftObjectRef.current = obj;
        fc.add(obj);
      } else if (activeToolRef.current === "highlight") {
        const highlightPadding = getHighlightPadding(brushSizeRef.current);
        const highlightColor = hexToRgba(drawColorRef.current, highlightOpacityRef.current);
        const highlightRects = snappedLine
          ? buildHighlightRectMetrics(
              currentLines,
              draftStartRef.current ?? pointer,
              pointer,
              snappedLine,
              snappedLine,
              highlightPadding.x,
              highlightPadding.y
            )
          : [];

        const obj = highlightRects.length > 1
          ? new Group(
              highlightRects.map((rect) => new Rect({
                ...rect,
                fill: highlightColor,
                stroke: "transparent",
                strokeWidth: 0,
                selectable: false,
                evented: false,
              })),
              {
                selectable: false,
                evented: false,
                objectCaching: false,
                subTargetCheck: false,
              }
            )
          : new Rect({
              left: highlightRects[0]?.left ?? pointer.x,
              top: highlightRects[0]?.top ?? (snappedLine ? snappedLine.top - highlightPadding.y : pointer.y),
              width: highlightRects[0]?.width ?? 1,
              height: highlightRects[0]?.height ?? (
                snappedLine
                  ? snappedLine.height + highlightPadding.y * 2
                  : Math.max(18, brushSizeRef.current * 4)
              ),
              fill: highlightColor,
              stroke: "transparent",
              strokeWidth: 0,
              selectable: false,
              evented: false,
              objectCaching: false,
            });
        draftObjectRef.current = obj;
        fc.add(obj);
      } else if (activeToolRef.current === "circle") {
        const obj = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 1,
          ry: 1,
          originX: "left",
          originY: "top",
          fill: "transparent",
          stroke: drawColorRef.current,
          strokeWidth: Math.max(1, brushSizeRef.current),
          selectable: false,
          evented: false,
        });
        draftObjectRef.current = obj;
        fc.add(obj);
      } else if (activeToolRef.current === "line") {
        const obj = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: drawColorRef.current,
          strokeWidth: Math.max(1, brushSizeRef.current),
          selectable: false,
          evented: false,
        });
        draftObjectRef.current = obj;
        fc.add(obj);
      }
    });
    fc.on("mouse:move", (opt: any) => {
      if (!draftStartRef.current || !draftObjectRef.current) return;
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e);
      if (!pointer) return;
      const start = draftStartRef.current;
      const left = Math.min(start.x, pointer.x);
      const top = Math.min(start.y, pointer.y);
      const width = Math.max(Math.abs(pointer.x - start.x), 1);
      const height = Math.max(Math.abs(pointer.y - start.y), 1);
      const shiftPressed = Boolean(opt.e?.shiftKey);

      if (activeToolRef.current === "rect") {
        if (shiftPressed) {
          const size = Math.max(width, height);
          draftObjectRef.current.set({
            left: pointer.x >= start.x ? start.x : start.x - size,
            top: pointer.y >= start.y ? start.y : start.y - size,
            width: size,
            height: size,
          });
        } else {
          draftObjectRef.current.set({ left, top, width, height });
        }
      } else if (activeToolRef.current === "highlight") {
        const currentLines = pageTextLinesRef.current.get(pageNumber) || [];
        const endLine = resolveHighlightEndLine(currentLines, draftLineRef.current, pointer);

        if (draftLineRef.current || endLine) {
          const startLine = draftLineRef.current ?? endLine!;
          const finishLine = endLine ?? draftLineRef.current ?? startLine;
          const highlightPadding = getHighlightPadding(brushSizeRef.current);
          const rects = buildHighlightRectMetrics(
            currentLines,
            start,
            pointer,
            startLine,
            finishLine,
            highlightPadding.x,
            highlightPadding.y
          );

          if (rects.length > 0) {
            const highlightColor = hexToRgba(drawColorRef.current, highlightOpacityRef.current);
            const nextDraft = rects.length > 1
              ? new Group(
                  rects.map((rect) => new Rect({
                    ...rect,
                    fill: highlightColor,
                    stroke: "transparent",
                    strokeWidth: 0,
                    selectable: false,
                    evented: false,
                  })),
                  {
                    selectable: false,
                    evented: false,
                    objectCaching: false,
                    subTargetCheck: false,
                  }
                )
              : new Rect({
                  ...rects[0],
                  fill: highlightColor,
                  stroke: "transparent",
                  strokeWidth: 0,
                  selectable: false,
                  evented: false,
                  objectCaching: false,
                });

            fc.remove(draftObjectRef.current);
            draftObjectRef.current = nextDraft;
            fc.add(nextDraft);
          }
        } else {
          draftObjectRef.current.set({
            left,
            top,
            width: Math.max(width, 24),
            height: Math.max(height, Math.max(18, brushSizeRef.current * 4)),
          });
        }
      } else if (activeToolRef.current === "circle") {
        if (shiftPressed) {
          const size = Math.max(width, height);
          draftObjectRef.current.set({
            left: pointer.x >= start.x ? start.x : start.x - size,
            top: pointer.y >= start.y ? start.y : start.y - size,
            rx: size / 2,
            ry: size / 2,
          });
        } else {
          draftObjectRef.current.set({ left, top, rx: width / 2, ry: height / 2 });
        }
      } else if (activeToolRef.current === "line") {
        if (shiftPressed) {
          const dx = pointer.x - start.x;
          const dy = pointer.y - start.y;
          if (Math.abs(dx) >= Math.abs(dy)) {
            draftObjectRef.current.set({ x1: start.x, y1: start.y, x2: pointer.x, y2: start.y });
          } else {
            draftObjectRef.current.set({ x1: start.x, y1: start.y, x2: start.x, y2: pointer.y });
          }
        } else {
          draftObjectRef.current.set({ x1: start.x, y1: start.y, x2: pointer.x, y2: pointer.y });
        }
      }

      draftObjectRef.current.setCoords?.();
      fc.renderAll();
    });
    fc.on("mouse:up", () => {
      const draft = draftObjectRef.current;
      if (!draft) return;

      suppressHistoryRef.current = false;
      if (activeToolRef.current === "rect" && draft.width < 8 && draft.height < 8) {
        draft.set({ width: 120, height: 70 });
      } else if (
        activeToolRef.current === "highlight" &&
        draft.type !== "group" &&
        draft.width < 10
      ) {
        const line = draftLineRef.current;
        if (line) {
          const highlightPadding = getHighlightPadding(brushSizeRef.current);
          const centerX = draftStartRef.current?.x ?? draft.left ?? line.left;
          const fallbackHalfWidth = Math.max(18, Math.min(34, line.height * 1.35));
          const left = clampHighlightX(line, centerX - fallbackHalfWidth, highlightPadding.x);
          const right = clampHighlightX(line, centerX + fallbackHalfWidth, highlightPadding.x);
          draft.set({
            left,
            top: line.top - highlightPadding.y,
            width: Math.max(right - left, 36),
            height: line.height + highlightPadding.y * 2,
          });
        } else {
          draft.set({ width: 72 });
        }
      } else if (activeToolRef.current === "circle" && draft.rx < 4 && draft.ry < 4) {
        draft.set({ rx: 42, ry: 42 });
      } else if (activeToolRef.current === "line") {
        const dx = Math.abs((draft.x2 ?? 0) - (draft.x1 ?? 0));
        const dy = Math.abs((draft.y2 ?? 0) - (draft.y1 ?? 0));
        if (dx < 8 && dy < 8) {
          draft.set({ x2: (draft.x1 ?? 0) + 140, y2: draft.y1 });
        }
      }
      draft.set({ selectable: true, evented: true });
      draft.setCoords?.();
      fc.setActiveObject(draft);
      fc.renderAll();
      pushHistory();

      draftObjectRef.current = null;
      draftStartRef.current = null;
      draftLineRef.current = null;
    });

    const stored = pageStatesRef.current.get(pageNumber);
    if (stored) {
      await loadCanvasState(fc, stored);
      if (version !== initVersionRef.current) {
        fc.dispose();
        return;
      }
    }
    pushHistory();
  }, [applyCanvasCssSize, getCanvasSize, loadCanvasState, pushHistory, syncToolbarFromObject]);

  const saveCurrent = useCallback(async () => {
    if (activeTextEditorRef.current?.pageNumber === currentPage) {
      await commitTextEditor();
    }
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    pageStatesRef.current.set(currentPage, json);
  }, [commitTextEditor, currentPage]);

  const goBack = useCallback(() => {
    void (async () => {
      await saveCurrent();
      if (hasUnsavedChanges) {
        const shouldLeave = window.confirm(
          isRu
            ? "Есть несохраненные изменения. Выйти из редактора?"
            : "You have unsaved changes. Leave the editor?"
        );
        if (!shouldLeave) return;
      }
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      setLocation("/");
    })();
  }, [hasUnsavedChanges, isRu, saveCurrent, setLocation]);

  const updateZoom = useCallback((updater: number | ((prev: number) => number)) => {
    setZoom((prev) => typeof updater === "function" ? (updater as (prev: number) => number)(prev) : updater);
  }, []);

  const openPdfPicker = useCallback((e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    if (loadingState !== "ready" || pageCount < 1) return;
    void initFabric(currentPage);
  }, [currentPage, initFabric, loadingState, pageCount]);

  useEffect(() => {
    return () => {
      fabricRef.current?.dispose?.();
      signFabricRef.current?.dispose?.();
    };
  }, []);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    drawColorRef.current = drawColor;
  }, [drawColor]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  useEffect(() => {
    fontFamilyRef.current = fontFamily;
  }, [fontFamily]);

  useEffect(() => {
    fontColorRef.current = fontColor;
  }, [fontColor]);

  useEffect(() => {
    textBoldRef.current = textBold;
  }, [textBold]);

  useEffect(() => {
    textItalicRef.current = textItalic;
  }, [textItalic]);

  useEffect(() => {
    textUnderlineRef.current = textUnderline;
  }, [textUnderline]);

  useEffect(() => {
    textAlignRef.current = textAlign;
  }, [textAlign]);

  useEffect(() => {
    highlightOpacityRef.current = highlightOpacity;
  }, [highlightOpacity]);

  useEffect(() => {
    activeTextEditorRef.current = activeTextEditor;
  }, [activeTextEditor]);

  useEffect(() => {
    if (!activeTextEditor) return;
    const ctx = getTextMeasureContext();
    if (!ctx) return;
    const measuredWidth = measureEditorTextWidth(ctx, activeTextEditor.text || " ", activeTextEditor);
    const nextWidth = clamp(
      measuredWidth + Math.max(8, activeTextEditor.fontSize * 0.42),
      18,
      activeTextEditor.maxWidth
    );
    if (Math.abs(nextWidth - activeTextEditor.width) > 0.5) {
      setActiveTextEditor((prev) => prev ? { ...prev, width: nextWidth } : prev);
    }
  }, [activeTextEditor, getTextMeasureContext]);

  useEffect(() => {
    if (!activeTextEditor || activeTextEditor.pageNumber !== currentPage) return;
    const frame = window.requestAnimationFrame(() => {
      textEditorRef.current?.focus();
      const value = textEditorRef.current?.value ?? "";
      textEditorRef.current?.setSelectionRange(value.length, value.length);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTextEditor, currentPage]);

  useEffect(() => {
    if (!activeTextEditor || activeTextEditor.pageNumber !== currentPage || !textEditorRef.current) return;
    const el = textEditorRef.current;
    el.style.height = `${activeTextEditor.minHeight}px`;
    el.style.height = `${Math.max(activeTextEditor.minHeight, el.scrollHeight)}px`;
  }, [activeTextEditor, currentPage]);

  useEffect(() => {
    if (selectionToolbarSyncRef.current) return;
    updateSelectedObjects((obj) => {
      if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
        obj.set({
          fill: fontColor,
          fontSize,
          fontFamily,
          fontWeight: textBold ? "bold" : "normal",
          fontStyle: textItalic ? "italic" : "normal",
          underline: textUnderline,
          textAlign,
        });
        if (typeof (obj as any).pdfxBaseFontSize === "number") {
          (obj as any).pdfxBaseFontSize = fontSize;
        }
        fitTextObjectToBounds(obj, fontSize);
      }
    });
  }, [fontColor, fontFamily, fontSize, textAlign, textBold, textItalic, textUnderline, updateSelectedObjects]);

  useEffect(() => {
    if (selectionToolbarSyncRef.current) return;
    updateSelectedObjects((obj) => {
      if (obj.type === "rect" && obj.stroke === "transparent") {
        obj.set({ fill: hexToRgba(drawColor, highlightOpacity) });
      } else if (obj.type === "line") {
        obj.set({ stroke: drawColor, strokeWidth: Math.max(1, brushSize) });
      } else if (obj.type === "ellipse" || (obj.type === "rect" && obj.stroke !== "transparent")) {
        obj.set({ stroke: drawColor, strokeWidth: Math.max(1, brushSize) });
      } else if (obj.type === "group" && typeof obj.getObjects === "function") {
        obj.getObjects().forEach((child: any) => {
          if (child.type === "rect") {
            child.set({ fill: hexToRgba(drawColor, highlightOpacity) });
          }
        });
      }
    });
  }, [brushSize, drawColor, highlightOpacity, updateSelectedObjects]);

  useEffect(() => {
    if (!activeTextEditorRef.current) return;
    setActiveTextEditor((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        fontFamily,
        fontSize,
        fontWeight: textBold ? "bold" as const : "normal" as const,
        fontStyle: textItalic ? "italic" as const : "normal" as const,
        underline: textUnderline,
        textAlign,
        color: fontColor,
      };
      const ctx = getTextMeasureContext();
      if (!ctx) return next;
      const textMetrics = measureEditorTextMetrics(ctx, next, prev.lineHeight);
      return {
        ...next,
        lineHeight: textMetrics.lineHeight,
        minHeight: textMetrics.lineHeight,
        top: next.baselineY != null ? next.baselineY - textMetrics.baselineFromTop : next.top,
      };
    });
  }, [fontColor, fontFamily, fontSize, getTextMeasureContext, textAlign, textBold, textItalic, textUnderline]);

  useEffect(() => {
    if (!fabricRef.current) return;
    const fc = fabricRef.current;

    if (activeTool === "draw") {
      fc.isDrawingMode = true;
      const brush = (fc as any)._pdfxPencilBrush;
      brush.color = drawColor;
      brush.width = brushSize;
      fc.freeDrawingBrush = brush;
    } else {
      fc.isDrawingMode = false;
    }

    if (activeTool === "eraser") {
      fc.selection = false;
      fc.hoverCursor = "not-allowed";
    } else if (activeTool === "select") {
      fc.selection = true;
      fc.hoverCursor = "move";
    } else {
      fc.selection = false;
      fc.hoverCursor = "crosshair";
    }
    fc.renderAll();
  }, [activeTool, drawColor, brushSize]);


  useEffect(() => {
    if (loadingState !== "ready" || pageCount < 1) return;
    const { width, height } = getCanvasSize(currentPage);
    applyCanvasCssSize(width, height);
  }, [applyCanvasCssSize, currentPage, getCanvasSize, loadingState, pageCount, zoom]);

  const renderCurrentPage = useCallback(async () => {
    if (!pdfjsDoc || !pdfCanvasRef.current) return;

    const canvas = pdfCanvasRef.current;
    const version = ++renderVersionRef.current;
    const pageNumber = currentPage;
    const renderScale = DISPLAY_SCALE * zoom;
    const { width, height } = getCanvasSize(pageNumber);

    renderQueueRef.current = renderQueueRef.current
      .catch(() => {})
      .then(async () => {
        if (version !== renderVersionRef.current) return;
        try {
          await renderPageToCanvas(pdfjsDoc, pageNumber, canvas, renderScale);
        } catch {
          if (version === renderVersionRef.current) {
            setError(isRu ? "Не удалось отрисовать страницу PDF" : "Failed to render PDF page");
          }
          return;
        }
        if (version !== renderVersionRef.current) return;
        applyCanvasCssSize(width, height);
        setError((prev) => (
          prev === "Failed to render PDF page" || prev === "Не удалось отрисовать страницу PDF"
            ? null
            : prev
        ));
      });

    return renderQueueRef.current;
  }, [applyCanvasCssSize, currentPage, getCanvasSize, isRu, pdfjsDoc, zoom]);

  useEffect(() => {
    if (loadingState !== "ready") return;
    void renderCurrentPage();
  }, [loadingState, renderCurrentPage]);

  const handleFile = useCallback(async (f: File) => {
    if (activeTextEditorRef.current?.pageNumber === currentPage) {
      await commitTextEditor();
    }
    if (hasUnsavedChanges && file) {
      const shouldReplace = window.confirm(
        isRu
          ? "Есть несохраненные изменения. Заменить текущий PDF?"
          : "You have unsaved changes. Replace the current PDF?"
      );
      if (!shouldReplace) return;
    }
    if (f.size > mbToBytes(MAX_EDIT_PDF_FILE_SIZE_MB)) {
      setError(
        isRu
          ? `Файл превышает лимит ${MAX_EDIT_PDF_FILE_SIZE_MB} МБ`
          : `File exceeds ${MAX_EDIT_PDF_FILE_SIZE_MB} MB limit`
      );
      return;
    }
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError(isRu ? "Пожалуйста загрузите PDF файл" : "Please upload a PDF file");
      return;
    }
    setError(null);
    setLoadingState("loading");
    setLoadProgress(10);

    try {
      const bytes = await f.arrayBuffer();
      const bytesForPdfLib = bytes.slice(0);
      const bytesForPdfJs = bytes.slice(0);
      pageOrigBytesRef.current = bytesForPdfLib;
      pageStatesRef.current.clear();
      pageTextLinesRef.current.clear();

      const pdfjs = await loadPdfJs();
      setLoadProgress(30);
      const doc = await pdfjs.getDocument({ data: new Uint8Array(bytesForPdfJs) }).promise;
      const count = doc.numPages;
      setLoadProgress(50);

      const dims: PageDims[] = [];
      const thumbs: string[] = [];
      const textLines = new Map<number, TextLineMetric[]>();
      const thumbCanvas = document.createElement("canvas");
      for (let i = 1; i <= count; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        dims.push({ width: vp.width, height: vp.height });
        textLines.set(i, await extractTextLines(page, DISPLAY_SCALE));

        const tvp = page.getViewport({ scale: THUMB_SCALE });
        thumbCanvas.width = Math.round(tvp.width);
        thumbCanvas.height = Math.round(tvp.height);
        const ctx = thumbCanvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: tvp, canvas: thumbCanvas }).promise;
        thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.6));
        setLoadProgress(50 + Math.round((i / count) * 45));
      }

      setPdfjsDoc(doc);
      pageTextLinesRef.current = textLines;
      setPageCount(count);
      setPageDims(dims);
      setThumbnails(thumbs);
      setCurrentPage(1);
      setFile(f);
      setHasSelection(false);
      setHasUnsavedChanges(false);
      setLoadProgress(100);
      setLoadingState("ready");
    } catch {
      setError(isRu ? "Не удалось загрузить PDF" : "Failed to load PDF");
      setLoadingState("idle");
    }
  }, [commitTextEditor, currentPage, file, hasUnsavedChanges, isRu]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const deleteSelectedObjects = useCallback(() => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects?.() || [];
    if (activeObjects.length === 0) return;
    activeObjects.forEach((obj: any) => fabricRef.current.remove(obj));
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    setHasSelection(false);
    setSelectionToolContext(null);
  }, []);

  const placeClonedObject = useCallback((cloned: any, offsetMultiplier = 1) => {
    if (!fabricRef.current || !cloned) return false;
    const { width, height } = getCanvasSize(currentPage);
    const scaledWidth = cloned.getScaledWidth?.() ?? cloned.width ?? 0;
    const scaledHeight = cloned.getScaledHeight?.() ?? cloned.height ?? 0;
    const offset = 18 * offsetMultiplier;
    const nextLeft = clamp((cloned.left ?? 0) + offset, 0, Math.max(0, width - scaledWidth));
    const nextTop = clamp((cloned.top ?? 0) + offset, 0, Math.max(0, height - scaledHeight));

    cloned.set({
      left: nextLeft,
      top: nextTop,
    });
    cloned.setCoords?.();
    fabricRef.current.discardActiveObject();
    fabricRef.current.add(cloned);
    fabricRef.current.setActiveObject(cloned);
    fabricRef.current.renderAll();
    setHasSelection(true);
    return true;
  }, [currentPage, getCanvasSize]);

  const insertClipboardText = useCallback(async (text: string) => {
    if (!fabricRef.current || !text.trim()) return false;
    const { Textbox } = await import("fabric");
    const { width, height } = getCanvasSize(currentPage);
    const currentLines = pageTextLinesRef.current.get(currentPage) || [];
    const pointer = { x: Math.min(width * 0.22, width - 72), y: Math.min(height * 0.18, height - 48) };
    const insertionStyle = resolveTextInsertionStyle(currentLines, pointer, {
      fontFamily: fontFamilyRef.current,
      fontSize: fontSizeRef.current,
      fontWeight: textBoldRef.current ? "bold" : "normal",
      fontStyle: textItalicRef.current ? "italic" : "normal",
    });
    const hasNearbyTextLine = currentLines.some((line) => Math.abs(line.centerY - pointer.y) <= Math.max(26, line.height));
    const obj = new Textbox(text, {
      left: insertionStyle.left,
      top: insertionStyle.top,
      fontSize: insertionStyle.fontSize,
      fill: fontColorRef.current,
      fontFamily: hasNearbyTextLine
        ? normalizeEditorFontFamily(insertionStyle.fontFamily)
        : fontFamilyRef.current,
      fontWeight: textBoldRef.current ? "bold" : insertionStyle.fontWeight,
      fontStyle: textItalicRef.current ? "italic" : insertionStyle.fontStyle,
      underline: textUnderlineRef.current,
      textAlign: textAlignRef.current,
      editable: false,
      lineHeight: 1.05,
      width: insertionStyle.maxWidth,
    });
    (obj as any).pdfxBaseFontSize = insertionStyle.fontSize;
    (obj as any).pdfxMaxWidth = insertionStyle.maxWidth;
    (obj as any).pdfxBaseTop = insertionStyle.top;
    fitTextObjectToBounds(obj, insertionStyle.fontSize);
    fabricRef.current.add(obj);
    obj.setCoords?.();
    try {
      fabricRef.current.setActiveObject?.(obj);
    } catch {
      // Ignore Fabric activation glitches and keep the inserted text visible.
    }
    fabricRef.current.requestRenderAll?.();
    setHasSelection(true);
    setHasUnsavedChanges(true);
    syncToolbarFromObject(obj);
    return true;
  }, [currentPage, getCanvasSize, syncToolbarFromObject]);

  const copySelection = useCallback(async () => {
    if (!fabricRef.current) return false;
    const activeObject = fabricRef.current.getActiveObject?.();
    if (!activeObject?.clone) return false;
    clipboardRef.current = await activeObject.clone();
    setHasClipboardObject(true);
    if ((activeObject.type === "textbox" || activeObject.type === "i-text" || activeObject.type === "text") && typeof activeObject.text === "string") {
      try {
        await navigator.clipboard?.writeText?.(activeObject.text);
      } catch {
        // Ignore clipboard API failures and keep internal object clipboard.
      }
    }
    return true;
  }, []);

  const pasteSelection = useCallback(async () => {
    if (clipboardRef.current?.clone) {
      const cloned = await clipboardRef.current.clone();
      return placeClonedObject(cloned, 1);
    }

    try {
      const text = await navigator.clipboard?.readText?.();
      if (text?.trim()) {
        return insertClipboardText(text);
      }
    } catch {
      // Ignore clipboard API failures.
    }

    return false;
  }, [insertClipboardText, placeClonedObject]);

  const duplicateSelection = useCallback(async () => {
    if (!fabricRef.current) return;
    const activeObject = fabricRef.current.getActiveObject?.();
    if (!activeObject?.clone) return;
    const cloned = await activeObject.clone();
    clipboardRef.current = cloned;
    setHasClipboardObject(true);
    placeClonedObject(cloned, 1);
  }, [placeClonedObject]);

  const moveSelectionLayer = useCallback((direction: "front" | "back") => {
    if (!fabricRef.current) return;
    const activeObject = fabricRef.current.getActiveObject?.();
    if (!activeObject) return;
    if (direction === "front") {
      fabricRef.current.bringObjectForward?.(activeObject, true);
    } else {
      fabricRef.current.sendObjectBackwards?.(activeObject, true);
    }
    activeObject.setCoords?.();
    fabricRef.current.renderAll();
    setHasUnsavedChanges(true);
    pushHistory();
  }, [pushHistory]);

  const discardActiveSelection = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    setHasSelection(false);
    setSelectionToolContext(null);
  }, []);

  const nudgeSelection = useCallback((dx: number, dy: number) => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects?.() || [];
    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj: any) => {
      obj.set({
        left: clamp((obj.left ?? 0) + dx, 0, Math.max(0, getCanvasSize(currentPage).width - (obj.getScaledWidth?.() ?? obj.width ?? 0))),
        top: clamp((obj.top ?? 0) + dy, 0, Math.max(0, getCanvasSize(currentPage).height - (obj.getScaledHeight?.() ?? obj.height ?? 0))),
      });
      obj.setCoords?.();
    });

    fabricRef.current.renderAll();
    setHasUnsavedChanges(true);
    pushHistory();
  }, [currentPage, getCanvasSize, pushHistory]);

  const switchPage = useCallback((p: number) => {
    if (p === currentPage) return;
    void (async () => {
      await saveCurrent();
      setCurrentPage(p);
    })();
  }, [currentPage, saveCurrent]);

  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLElement>) => {
    if (!fabricRef.current) return;
    if (activeTool === "select" || activeTool === "draw" || activeTool === "eraser") return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { width, height } = getCanvasSize(currentPage);
    const x = (e.clientX - rect.left) * (width / rect.width);
    const y = (e.clientY - rect.top) * (height / rect.height);

    const { IText, Rect, Circle: FabricCircle, Line } = await import("fabric");

    if (activeTool === "text") {
      const obj = new IText("Текст", {
        left: x, top: y,
        fontSize, fill: fontColor,
        fontFamily: "Arial",
        editable: true,
      });
      obj.set("text", isRu ? "Текст" : "Text");
      fabricRef.current.add(obj);
      fabricRef.current.setActiveObject(obj);
      (obj as any).enterEditing?.();
    } else if (activeTool === "rect") {
      const obj = new Rect({
        left: x, top: y, width: 100, height: 60,
        fill: "transparent", stroke: drawColor, strokeWidth: 2,
      });
      fabricRef.current.add(obj);
    } else if (activeTool === "circle") {
      const obj = new FabricCircle({
        left: x, top: y, radius: 40,
        fill: "transparent", stroke: drawColor, strokeWidth: 2,
      });
      fabricRef.current.add(obj);
    } else if (activeTool === "line") {
      const obj = new Line([x, y, x + 100, y], {
        stroke: drawColor, strokeWidth: 2,
      });
      fabricRef.current.add(obj);
    } else if (activeTool === "highlight") {
      const obj = new Rect({
        left: x, top: y, width: 150, height: 24,
        fill: "rgba(255,230,0,0.35)", stroke: "transparent", strokeWidth: 0,
      });
      fabricRef.current.add(obj);
    }
    fabricRef.current.renderAll();
  }, [activeTool, currentPage, drawColor, fontColor, fontSize, getCanvasSize, isRu]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const img = e.target.files?.[0];
    if (!img || !fabricRef.current) return;
    const { FabricImage } = await import("fabric");
    const { width } = getCanvasSize(currentPage);
    const url = URL.createObjectURL(img);
    const el = new window.Image();
    el.onload = async () => {
      const fi = await FabricImage.fromURL(url);
      URL.revokeObjectURL(url);
      const maxW = width * 0.4;
      if (fi.width! > maxW) fi.scaleToWidth(maxW);
      fi.set({ left: 50, top: 50 });
      fabricRef.current.add(fi);
      fabricRef.current.setActiveObject(fi);
      fabricRef.current.renderAll();
      setActiveTool("select");
    };
    el.onerror = () => URL.revokeObjectURL(url);
    el.src = url;
    e.target.value = "";
  }, [currentPage, getCanvasSize]);

  const handleUndo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0 || !fabricRef.current) return;
    historyIndexRef.current = idx - 1;
    setHistoryVersion((prev) => prev + 1);
    suppressHistoryRef.current = true;
    fabricRef.current.loadFromJSON(JSON.parse(historyRef.current[idx - 1])).then(() => {
      suppressHistoryRef.current = false;
      fabricRef.current.renderAll();
      setHistoryVersion((prev) => prev + 1);
    }).catch(() => {
      suppressHistoryRef.current = false;
      setHistoryVersion((prev) => prev + 1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    const idx = historyIndexRef.current;
    const hist = historyRef.current;
    if (idx >= hist.length - 1 || !fabricRef.current) return;
    historyIndexRef.current = idx + 1;
    setHistoryVersion((prev) => prev + 1);
    suppressHistoryRef.current = true;
    fabricRef.current.loadFromJSON(JSON.parse(hist[idx + 1])).then(() => {
      suppressHistoryRef.current = false;
      fabricRef.current.renderAll();
      setHistoryVersion((prev) => prev + 1);
    }).catch(() => {
      suppressHistoryRef.current = false;
      setHistoryVersion((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target?.closest?.("input, textarea, [contenteditable='true'], [role='textbox']")
      );
      const isEditingFabricText = Boolean(fabricRef.current?.getActiveObject?.()?.isEditing);
      if (isTypingTarget || isEditingFabricText) return;

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.code === "KeyY") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyZ")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
        e.preventDefault();
        void handleSaveRef.current?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyB") {
        e.preventDefault();
        setTextBold((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyI") {
        e.preventDefault();
        setTextItalic((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyU") {
        e.preventDefault();
        setTextUnderline((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyC" && fabricRef.current) {
        const activeObjects = fabricRef.current.getActiveObjects?.() || [];
        if (activeObjects.length > 0) {
          e.preventDefault();
          void copySelection();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyV" && fabricRef.current) {
        if (clipboardRef.current) {
          e.preventDefault();
          void pasteSelection();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyD" && fabricRef.current) {
        const activeObjects = fabricRef.current.getActiveObjects?.() || [];
        if (activeObjects.length > 0) {
          e.preventDefault();
          void duplicateSelection();
          return;
        }
      }

      if ((e.key === "Delete" || e.key === "Backspace") && fabricRef.current) {
        const activeObjects = fabricRef.current.getActiveObjects?.() || [];
        if (activeObjects.length > 0) {
          e.preventDefault();
          deleteSelectedObjects();
          return;
        }
      }

      if (e.key === "Escape") {
        if (fabricRef.current?.getActiveObjects?.()?.length) {
          e.preventDefault();
          discardActiveSelection();
          return;
        }
        setActiveTool("select");
        return;
      }

      if ((e.key === "Enter" || e.key === "F2") && fabricRef.current) {
        const activeObject = fabricRef.current.getActiveObject?.();
        if (activeObject && isEditableTextObject(activeObject)) {
          e.preventDefault();
          openTextObjectEditor(currentPage, activeObject);
          return;
        }
      }

      if (fabricRef.current && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const activeObjects = fabricRef.current.getActiveObjects?.() || [];
        if (activeObjects.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          if (e.key === "ArrowUp") nudgeSelection(0, -step);
          if (e.key === "ArrowDown") nudgeSelection(0, step);
          if (e.key === "ArrowLeft") nudgeSelection(-step, 0);
          if (e.key === "ArrowRight") nudgeSelection(step, 0);
          return;
        }
      }

      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const code = e.code;
      if (code === "KeyV") {
        setActiveTool("select");
      } else if (code === "KeyT") {
        setActiveTool("text");
      } else if (code === "KeyB") {
        setActiveTool("draw");
      } else if (code === "KeyH") {
        setActiveTool("highlight");
      } else if (code === "KeyR") {
        setActiveTool("rect");
      } else if (code === "KeyC") {
        setActiveTool("circle");
      } else if (code === "KeyL") {
        setActiveTool("line");
      } else if (code === "KeyE") {
        setActiveTool("eraser");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [copySelection, currentPage, deleteSelectedObjects, discardActiveSelection, duplicateSelection, handleRedo, handleUndo, nudgeSelection, openTextObjectEditor, pasteSelection]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const openSignModal = useCallback(async () => {
    setSignModalOpen(true);
    setTimeout(async () => {
      if (!signCanvasRef.current) return;
      const { Canvas: FabricCanvas, PencilBrush } = await import("fabric");
      if (signFabricRef.current) signFabricRef.current.dispose();
      const sc = new FabricCanvas(signCanvasRef.current, {
        isDrawingMode: true, backgroundColor: "#ffffff",
        width: 480, height: 180,
      });
      const pb = new PencilBrush(sc);
      pb.color = "#1a1a1a";
      pb.width = 3;
      sc.freeDrawingBrush = pb;
      signFabricRef.current = sc;
    }, 100);
  }, []);

  const clearSignaturePad = useCallback(() => {
    if (!signFabricRef.current) return;
    signFabricRef.current.clear();
    signFabricRef.current.backgroundColor = "#ffffff";
    signFabricRef.current.renderAll();
  }, []);

  const confirmSign = useCallback(async () => {
    if (!signFabricRef.current || !fabricRef.current) return;
    if ((signFabricRef.current.getObjects?.() || []).length === 0) return;
    const dataUrl = signFabricRef.current.toDataURL({ format: "png", quality: 0.9 });
    const { FabricImage } = await import("fabric");
    const el = new window.Image();
    el.onload = async () => {
      const fi = await FabricImage.fromURL(dataUrl);
      fi.scaleToWidth(200);
      fi.set({ left: 50, top: 50 });
      fabricRef.current.add(fi);
      fabricRef.current.setActiveObject(fi);
      fabricRef.current.renderAll();
      setActiveTool("select");
    };
    el.src = dataUrl;
    setSignModalOpen(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!pageOrigBytesRef.current) {
      setError(
        isRu
          ? "Не удалось подготовить исходный PDF. Перезагрузите файл и попробуйте снова."
          : "Failed to prepare source PDF. Please re-upload and try again."
      );
      return;
    }
    if (!pdfjsDoc || pageCount < 1) {
      setError(
        isRu
          ? "PDF еще загружается. Попробуйте снова через секунду."
          : "PDF is still loading. Try again in a moment."
      );
      return;
    }
    setError(null);
    setIsSaving(true);
    await saveCurrent();

    try {
      const pdfDoc = await PDFDocument.load(pageOrigBytesRef.current, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pageCount; i++) {
        const state = i + 1 === currentPage
          ? (fabricRef.current ? JSON.stringify(fabricRef.current.toJSON()) : null)
          : pageStatesRef.current.get(i + 1);

        if (!state) continue;
        const parsed = JSON.parse(state);
        if (!parsed.objects || parsed.objects.length === 0) continue;

        const dim = pageDims[i];
        const displayW = Math.round(dim.width * DISPLAY_SCALE);
        const displayH = Math.round(dim.height * DISPLAY_SCALE);

        const { Canvas: FabricCanvas } = await import("fabric");
        const tmpEl = document.createElement("canvas");
        tmpEl.width = displayW;
        tmpEl.height = displayH;
        const tmpFc = new FabricCanvas(tmpEl, { backgroundColor: "", width: displayW, height: displayH });
        await tmpFc.loadFromJSON(parsed);
        tmpFc.renderAll();

        const pngDataUrl = tmpFc.toDataURL({ format: "png", multiplier: 1 });
        tmpFc.dispose();

        const imgBytes = dataUrlToBytes(pngDataUrl);
        const pngImage = await pdfDoc.embedPng(imgBytes);
        const page = pages[i];
        const { width: pdfW, height: pdfH } = page.getSize();
        page.drawImage(pngImage, { x: 0, y: 0, width: pdfW, height: pdfH });
      }

      const saved = await pdfDoc.save();
      const blob = new Blob([saved], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (file?.name?.replace(/\.pdf$/i, "") || "document") + "-edited.pdf";
      a.click();
      setHasUnsavedChanges(false);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [pageCount, currentPage, pageDims, file, pdfjsDoc, saveCurrent, isRu]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const toolButtons: { id: ToolType; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: t.tools.select },
    { id: "text", icon: Type, label: t.tools.text },
    { id: "draw", icon: Pencil, label: t.tools.draw },
    { id: "image", icon: ImageIcon, label: t.tools.image },
    { id: "sign", icon: PenLine, label: t.tools.sign },
    { id: "rect", icon: Square, label: t.tools.rect },
    { id: "circle", icon: Circle, label: t.tools.circle },
    { id: "line", icon: Minus, label: t.tools.line },
    { id: "highlight", icon: Highlighter, label: t.tools.highlight },
    { id: "eraser", icon: Eraser, label: t.tools.eraser },
  ];

  const COLORS = EDITOR_COLORS;
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current >= 0 && historyIndexRef.current < historyRef.current.length - 1;

  if (loadingState === "idle" || loadingState === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1" onClick={goBack}>
              <ArrowLeft className="size-4" />
              {isRu ? "Все инструменты" : "All tools"}
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
              <p className="text-slate-400">
                {isRu
                  ? "Добавляйте текст, рисунки, подписи и фигуры прямо в браузере. Файл не отправляется на сервер."
                  : "Add text, drawings, signatures and shapes directly in the browser. File never leaves your device."}
              </p>
            </div>

            {loadingState === "loading" ? (
              <div
                className="rounded-2xl p-12 text-center"
                style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Loader2 className="size-10 text-blue-400 mx-auto mb-4 animate-spin" />
                <p className="text-white font-medium mb-2">{isRu ? "Загрузка PDF…" : "Loading PDF…"}</p>
                <div className="w-full max-w-xs mx-auto rounded-full h-2 bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${loadProgress}%` }}
                  />
                </div>
                <p className="text-slate-400 text-sm mt-2">{loadProgress}%</p>
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-2xl border-2 border-dashed transition-colors duration-200 cursor-pointer",
                  isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/15 hover:border-white/30"
                )}
                style={{ background: isDragging ? undefined : "rgba(15,23,42,0.7)" }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={openPdfPicker}
                data-testid="dropzone-edit-pdf"
              >
                <div className="p-16 text-center">
                  <div
                    className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl"
                    style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                  >
                    <Upload className="size-8 text-white" />
                  </div>
                  <p className="text-white font-medium mb-1">{t.upload}</p>
                  <button
                    type="button"
                    onClick={openPdfPicker}
                    className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                  >
                    {t.choose}
                  </button>
                  <p className="text-slate-500 text-sm mt-2">{t.limit} · PDF</p>
                  {error && <p className="text-red-400 text-sm mt-3 font-medium">{error}</p>}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <div>
            <div
              className="rounded-2xl p-5"
              style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <h3 className="text-white font-semibold mb-4">{t.howToUse}</h3>
              <ol className="space-y-3">
                {t.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-slate-300 text-sm">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-slate-500 text-xs mb-3">{isRu ? "Похожие инструменты" : "Related tools"}</p>
                <div className="flex flex-col gap-2">
                  {[
                    { slug: "sign-pdf", label: isRu ? "Подписать PDF" : "Sign PDF" },
                    { slug: "watermark-pdf", label: isRu ? "Водяной знак" : "Watermark PDF" },
                    { slug: "protect-pdf", label: isRu ? "Защитить PDF" : "Protect PDF" },
                  ].map(({ slug, label }) => (
                    <Link key={slug} href={`/tools/${slug}`}>
                      <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm group">
                        <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                        {label}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentDim = pageDims[currentPage - 1] || { width: 595, height: 842 };
  const canvasW = Math.round(currentDim.width * DISPLAY_SCALE * zoom);
  const canvasH = Math.round(currentDim.height * DISPLAY_SCALE * zoom);

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left sidebar: thumbnails */}
        <div
          className="w-44 flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ background: "rgba(2,6,23,0.9)", borderRight: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="p-2 text-xs font-medium text-slate-400 sticky top-0 z-10 py-3 px-3"
            style={{ background: "rgba(2,6,23,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {pageCount} {isRu ? "страниц" : "pages"}
          </div>
          <div className="flex flex-col gap-2 p-2">
            {thumbnails.map((src, i) => (
              <button
                key={i}
                onClick={() => switchPage(i + 1)}
                data-testid={`thumb-page-${i + 1}`}
                className={cn(
                  "rounded-lg overflow-hidden border-2 transition-all duration-150",
                  currentPage === i + 1
                    ? "border-blue-500 shadow-lg shadow-blue-500/20"
                    : "border-transparent hover:border-white/20"
                )}
              >
                <img src={src} alt={`Page ${i + 1}`} className="w-full block" />
                <div className="text-center text-xs text-slate-500 py-1">{i + 1}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div
            className="flex items-center gap-1 px-3 py-2 flex-wrap"
            style={{ background: "rgba(2,6,23,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              onClick={goBack}
              className="mr-1 flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label={isRu ? "Назад" : "Back"}
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="w-px h-6 mr-1 bg-white/10" />

            {/* Tools */}
            {toolButtons.map(({ id, icon: Icon, label }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (id === "image") {
                        document.getElementById("img-upload-input")?.click();
                        return;
                      }
                      if (id === "sign") { openSignModal(); return; }
                      setActiveTool(id);
                    }}
                    data-testid={`tool-${id}`}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition-all",
                      activeTool === id
                        ? "text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                    style={activeTool === id ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : undefined}
                  >
                    <Icon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{label}</p>
                  {id === "eraser" && activeTool === "eraser" && (
                    <p className="text-xs text-slate-400">{t.eraseHint}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}

            <div className="w-px h-6 mx-1 bg-white/10" />

            {/* Color picker */}
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setDrawColor(c); setFontColor(c); }}
                  data-testid={`color-${c.replace("#", "")}`}
                  className={cn(
                    "size-5 rounded-full border-2 transition-all",
                    (drawColor === c || fontColor === c) ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {(activeTool === "draw" || activeTool === "highlight" || activeTool === "rect" || activeTool === "circle" || activeTool === "line" || selectionToolContext === "stroke" || selectionToolContext === "highlight") && (
              <div className="ml-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {isRu ? "Толщина" : "Size"}
                </span>
                <input
                  type="range"
                  min={1}
                  max={activeTool === "highlight" ? 12 : 24}
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  className="w-20 accent-yellow-400"
                />
                <span className="w-5 text-center text-xs text-slate-300">{brushSize}</span>
              </div>
            )}

            {(activeTool === "text" || selectionToolContext === "text") && (
              <div className="ml-2 flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {isRu ? "Шрифт" : "Font"}
                </span>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as (typeof EDITOR_FONT_FAMILIES)[number])}
                  className="h-8 rounded-md border border-white/10 bg-slate-950/70 px-2 text-xs text-slate-100 outline-none"
                >
                  {EDITOR_FONT_FAMILIES.map((family) => (
                    <option key={family} value={family}>{family}</option>
                  ))}
                </select>
                <input
                  type="range"
                  min={1}
                  max={72}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-20 accent-blue-400"
                />
                <span className="w-7 text-center text-xs text-slate-300">{fontSize}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTextBold((prev) => !prev)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md transition-all",
                      textBold ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                    aria-label={isRu ? "Жирный" : "Bold"}
                  >
                    <Bold className="size-4" />
                  </button>
                  <button
                    onClick={() => setTextItalic((prev) => !prev)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md transition-all",
                      textItalic ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                    aria-label={isRu ? "Курсив" : "Italic"}
                  >
                    <Italic className="size-4" />
                  </button>
                  <button
                    onClick={() => setTextUnderline((prev) => !prev)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md transition-all",
                      textUnderline ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                    aria-label={isRu ? "Подчеркнутый" : "Underline"}
                  >
                    <Underline className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { value: "left", icon: AlignLeft, label: isRu ? "По левому краю" : "Align left" },
                    { value: "center", icon: AlignCenter, label: isRu ? "По центру" : "Align center" },
                    { value: "right", icon: AlignRight, label: isRu ? "По правому краю" : "Align right" },
                    { value: "justify", icon: AlignJustify, label: isRu ? "По ширине" : "Justify" },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTextAlign(value as TextAlignOption)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md transition-all",
                        textAlign === value ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                      aria-label={label}
                    >
                      <Icon className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(activeTool === "highlight" || selectionToolContext === "highlight") && (
              <div className="ml-2 flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {isRu ? "Прозр." : "Opacity"}
                </span>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={Math.round(highlightOpacity * 100)}
                  onChange={(e) => setHighlightOpacity(parseInt(e.target.value, 10) / 100)}
                  className="w-20 accent-yellow-400"
                />
                <span className="w-8 text-center text-xs text-slate-300">{Math.round(highlightOpacity * 100)}%</span>
              </div>
            )}

            <div className="w-px h-6 mx-1 bg-white/10" />

            {(hasSelection || hasClipboardObject) && (
              <>
                <div className="flex items-center gap-1 rounded-lg bg-white/5 px-1 py-1">
                  <button
                    onClick={() => void pasteSelection()}
                    disabled={!hasClipboardObject}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Вставить объект" : "Paste object"}
                  >
                    <ClipboardPaste className="size-4" />
                  </button>
                  <button
                    onClick={duplicateSelection}
                    disabled={!hasSelection}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Дублировать объект" : "Duplicate object"}
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    onClick={() => moveSelectionLayer("front")}
                    disabled={!hasSelection}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Поднять слой" : "Bring forward"}
                  >
                    <ChevronsUp className="size-4" />
                  </button>
                  <button
                    onClick={() => moveSelectionLayer("back")}
                    disabled={!hasSelection}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Опустить слой" : "Send backward"}
                  >
                    <ChevronsDown className="size-4" />
                  </button>
                  <button
                    onClick={deleteSelectedObjects}
                    disabled={!hasSelection}
                    className="flex size-9 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Удалить объект" : "Delete object"}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="w-px h-6 mx-1 bg-white/10" />
              </>
            )}

            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  data-testid="button-undo"
                  className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                >
                  <Undo2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>{t.undo} (Ctrl+Z)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  data-testid="button-redo"
                  className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                >
                  <Redo2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>{t.redo}</p></TooltipContent>
            </Tooltip>

            <div className="w-px h-6 mx-1 bg-white/10" />

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                data-testid="button-zoom-out"
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="text-slate-300 text-xs w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => updateZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                data-testid="button-zoom-in"
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                onClick={() => updateZoom(1)}
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <Maximize2 className="size-3.5" />
              </button>
            </div>

            <div className="flex-1" />

            {/* Page nav */}
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <button
                onClick={() => switchPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="flex size-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs">{t.page} {currentPage} / {pageCount}</span>
              <button
                onClick={() => switchPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage >= pageCount}
                className="flex size-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="w-px h-6 mx-2 bg-white/10" />

            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="gap-2"
              style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
              data-testid="button-save-pdf"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isSaving ? t.saving : t.save}
            </Button>
          </div>

          {error && (
            <div className="mx-3 mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mx-3 mt-2 flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <span className={cn("font-medium", hasUnsavedChanges ? "text-amber-300" : "text-emerald-300")}>
              {hasUnsavedChanges
                ? (isRu ? "Есть несохраненные изменения" : "Unsaved changes")
                : (isRu ? "Все изменения сохранены локально" : "All changes are saved locally")}
            </span>
            <span className="text-slate-400">
              {isRu ? "Горячие клавиши:" : "Hotkeys:"} `V` {isRu ? "выбор" : "select"}, `T` {isRu ? "текст" : "text"}, `B` {isRu ? "кисть" : "draw"}, `H` {isRu ? "маркер" : "highlight"}, `R/C/L` {isRu ? "фигуры" : "shapes"}, `Ctrl+S` {isRu ? "сохранить" : "save"}
            </span>
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-auto" style={{ background: "#1a1f2e" }}>
            <div className="flex items-start justify-center min-h-full p-6">
              <div
                className="relative shadow-2xl"
                style={{ width: canvasW, height: canvasH, cursor: activeTool === "text" || activeTool === "rect" || activeTool === "circle" || activeTool === "line" || activeTool === "highlight" ? "crosshair" : undefined }}
              >
                <canvas
                  ref={pdfCanvasRef}
                  style={{ display: "block", position: "absolute", top: 0, left: 0 }}
                />
                <canvas
                  ref={fabricElRef}
                  id="fabric-canvas"
                  style={{ position: "absolute", top: 0, left: 0 }}
                />
                {activeTextEditor && activeTextEditor.pageNumber === currentPage && (
                  <textarea
                    ref={textEditorRef}
                    value={activeTextEditor.text}
                    onChange={(e) => {
                      const nextText = e.target.value;
                      setActiveTextEditor((prev) => prev ? { ...prev, text: nextText } : prev);
                      setHasUnsavedChanges(true);
                    }}
                    onBlur={() => {
                      void commitTextEditor();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelTextEditor();
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.code === "KeyB") {
                        e.preventDefault();
                        setTextBold((prev) => !prev);
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.code === "KeyI") {
                        e.preventDefault();
                        setTextItalic((prev) => !prev);
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.code === "KeyU") {
                        e.preventDefault();
                        setTextUnderline((prev) => !prev);
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
                        e.preventDefault();
                        void commitTextEditor().then((saved) => {
                          if (saved) {
                            void handleSaveRef.current?.();
                          }
                        });
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        void commitTextEditor();
                      }
                    }}
                    spellCheck={false}
                    className="absolute resize-none overflow-hidden border-0 outline-none"
                    style={{
                      left: activeTextEditor.left,
                      top: activeTextEditor.top,
                      width: activeTextEditor.width,
                      minHeight: activeTextEditor.minHeight,
                      maxWidth: activeTextEditor.maxWidth,
                      padding: 0,
                      margin: 0,
                      background: activeTextEditor.backgroundColor,
                      boxSizing: "border-box",
                      color: activeTextEditor.color,
                      fontFamily: activeTextEditor.fontFamily,
                      fontSize: activeTextEditor.fontSize,
                      fontWeight: activeTextEditor.fontWeight,
                      fontStyle: activeTextEditor.fontStyle,
                      textAlign: activeTextEditor.textAlign,
                      lineHeight: `${activeTextEditor.lineHeight}px`,
                      textDecoration: activeTextEditor.underline ? "underline" : "none",
                      letterSpacing: "0px",
                      fontKerning: "normal",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "break-word",
                      transform: "translateZ(0)",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image upload input */}
      <input
        id="img-upload-input"
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Signature modal */}
      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ background: "rgba(15,23,42,0.98)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">{t.signTitle}</DialogTitle>
          </DialogHeader>
          <div className="mt-3">
            <div
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              <canvas
                ref={signCanvasRef}
                id="sign-canvas"
                className="block w-full"
                style={{ touchAction: "none" }}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={clearSignaturePad}
                className="flex-1 text-slate-400 hover:text-white"
                data-testid="button-sign-clear"
              >
                {t.signClear}
              </Button>
              <Button
                onClick={confirmSign}
                className="flex-1"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                data-testid="button-sign-confirm"
              >
                {t.signConfirm}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
