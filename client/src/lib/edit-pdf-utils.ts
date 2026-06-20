import {
  type TextLineMetric,
  type TextSegmentMetric,
  type TextInsertionStyle,
  type DrawColor,
  DISPLAY_SCALE,
  DISALLOWED_FONT_FAMILIES,
  EDITOR_COLORS,
  EDITOR_FONT_FAMILIES,
} from "./edit-pdf-types";

import { DEFAULT_MAX_FILE_SIZE_MB } from "./upload-limits";

export { DISPLAY_SCALE, THUMB_SCALE } from "./edit-pdf-types";
export { EDITOR_COLORS, EDITOR_FONT_FAMILIES, DISALLOWED_FONT_FAMILIES, PDFX_TEXT_CUSTOM_PROPS } from "./edit-pdf-types";
export { DEFAULT_MAX_FILE_SIZE_MB as MAX_EDIT_PDF_FILE_SIZE_MB } from "./upload-limits";

export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;
  return pdfjs;
}

export async function renderPageToCanvas(
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

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function hexToRgba(hex: string, alpha: number) {
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

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeEditorFontFamily(fontFamily?: string) {
  const normalized = (fontFamily ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Arial";
  if (DISALLOWED_FONT_FAMILIES.has(normalized)) return "Arial";
  return normalized;
}

export function isEditableTextObject(obj: any) {
  return obj?.type === "textbox" || obj?.type === "i-text" || obj?.type === "text";
}

export function rgbComponentToHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

export function parseCanvasColor(color?: string): { hex: string; alpha: number } | null {
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

export function toEditorColor(color?: string): DrawColor | null {
  const parsed = parseCanvasColor(color);
  if (!parsed) return null;
  return EDITOR_COLORS.includes(parsed.hex as DrawColor) ? (parsed.hex as DrawColor) : null;
}

export function fitTextObjectToBounds(obj: any, fallbackFontSize: number) {
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

export function buildEditorFontString(editor: Pick<import("./edit-pdf-types").ActiveTextEditor, "fontStyle" | "fontWeight" | "fontSize" | "fontFamily">) {
  return `${editor.fontStyle} ${editor.fontWeight} ${editor.fontSize}px "${editor.fontFamily}"`;
}

export function measureEditorTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  editor: Pick<import("./edit-pdf-types").ActiveTextEditor, "fontStyle" | "fontWeight" | "fontSize" | "fontFamily">
) {
  ctx.font = buildEditorFontString(editor);
  // Canvas measureText collapses trailing whitespace out of the advance width,
  // so a line ending in spaces measures the same as without them. The inline
  // editor auto-fits its width to this value and clips overflow, making typed
  // trailing spaces invisible. Re-add the trailing run explicitly.
  const spaceWidth = ctx.measureText(" ").width;
  const lines = text.split("\n");
  const widestLine = lines.reduce((max, line) => {
    const trailing = line.length - line.replace(/[ \t]+$/, "").length;
    return Math.max(max, ctx.measureText(line || " ").width + trailing * spaceWidth);
  }, 0);
  return widestLine;
}

export function measureEditorTextMetrics(
  ctx: CanvasRenderingContext2D,
  editor: Pick<import("./edit-pdf-types").ActiveTextEditor, "fontStyle" | "fontWeight" | "fontSize" | "fontFamily">,
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

export function normalizePdfFontFamily(fontFamily?: string, fontName?: string) {
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

export function getFontTraits(fontName?: string, fontFamily?: string) {
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

export function splitTextIntoSegments(
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

export async function extractTextLines(page: any, scale: number): Promise<TextLineMetric[]> {
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

export function findNearestTextLine(lines: TextLineMetric[], x: number, y: number, maxScore = 40): TextLineMetric | null {
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

export function findNearestTextSegment(line: TextLineMetric, x: number): TextSegmentMetric | null {
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

export function estimateLineCaretIndex(line: TextLineMetric, x: number) {
  const text = line.text ?? "";
  if (!text) return 0;
  const ratio = clamp((x - line.left) / Math.max(1, line.right - line.left), 0, 1);
  return clamp(Math.round(text.length * ratio), 0, text.length);
}

export function getHighlightPadding(size: number) {
  return {
    x: 2,
    y: clamp(Math.round(size / 2), 2, 7),
  };
}

export function clampHighlightX(line: TextLineMetric, x: number, paddingX = 2) {
  return clamp(x, line.left - paddingX, line.right + paddingX);
}

export function resolveHighlightEndLine(
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

export function resolveTextInsertionStyle(
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

export interface LineEditSeed {
  text: string;
  left: number;
  top: number;
  baselineY: number;
  maxWidth: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  mask: { left: number; top: number; width: number; height: number };
}

// Derives everything needed to edit an existing PDF text line in place: the
// normalized editor seed (text/font/coords) plus the white-mask rect that hides
// the original glyphs. Shared shape with the text editor + find/replace mask.
export function buildLineEditSeed(line: TextLineMetric): LineEditSeed {
  const fontSize = line.fontSize;
  const baselineY = line.bottom;
  const top = baselineY - fontSize * 0.82;
  const maskPadX = Math.max(2, fontSize * 0.15);
  const maskPadY = Math.max(2, fontSize * 0.18);
  return {
    text: line.text ?? "",
    left: line.left,
    top,
    baselineY,
    maxWidth: Math.max(line.right - line.left + fontSize * 0.5, fontSize * 4.5, 72),
    fontFamily: normalizeEditorFontFamily(line.fontFamily),
    fontSize,
    fontWeight: line.fontWeight === "bold" ? "bold" : "normal",
    fontStyle: line.fontStyle === "italic" ? "italic" : "normal",
    mask: {
      left: line.left - maskPadX,
      top: line.top - maskPadY,
      width: line.right - line.left + maskPadX * 2,
      height: line.height + maskPadY * 2,
    },
  };
}

export function resolveHighlightRange(
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

export function buildHighlightRectMetrics(
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