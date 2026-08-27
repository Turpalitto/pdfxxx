import { PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib';

// ============================================================
// Vector export: fabric canvas JSON → native pdf-lib drawing ops.
// ============================================================
// Keeps text selectable/sharp and shapes crisp instead of stamping a
// full-page raster over the original page. Returns false when the state
// contains something we cannot reproduce faithfully — callers should
// fall back to the rasterized path for that page.

export interface FabricObjectJson {
  type?: string;
  visible?: boolean;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;
  originX?: string;
  originY?: string;
  fill?: unknown;
  stroke?: unknown;
  strokeWidth?: number;
  // text
  text?: string;
  fontSize?: number;
  lineHeight?: number;
  // line
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // circle
  radius?: number;
  // path
  path?: unknown;
  pathOffset?: { x: number; y: number };
  // image
  src?: string;
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseFabricColor(value: unknown): Rgba | null {
  if (typeof value !== 'string' || value === '' || value === 'transparent' || value === 'none') {
    return null;
  }
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
      a: 1,
    };
  }
  const rgbm = value.trim().match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.%]+))?\s*\)$/i);
  if (rgbm) {
    const aRaw = rgbm[4];
    let a = 1;
    if (aRaw !== undefined) {
      a = aRaw.endsWith('%') ? parseFloat(aRaw) / 100 : parseFloat(aRaw);
    }
    return { r: parseFloat(rgbm[1]) / 255, g: parseFloat(rgbm[2]) / 255, b: parseFloat(rgbm[3]) / 255, a };
  }
  if (value === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (value === 'white') return { r: 1, g: 1, b: 1, a: 1 };
  return null;
}

function objOpacity(obj: FabricObjectJson): number {
  const o = typeof obj.opacity === 'number' ? obj.opacity : 1;
  return Math.min(1, Math.max(0, o));
}

function isSupported(obj: FabricObjectJson): boolean {
  if (obj.visible === false) return true; // skippable
  if (obj.originX && obj.originX !== 'left') return false;
  if (obj.originY && obj.originY !== 'top') return false;
  const t = obj.type ?? '';
  return ['i-text', 'text', 'textbox', 'rect', 'circle', 'ellipse', 'line', 'path', 'image'].includes(t);
}

function nonAscii(text: string): boolean {
  // eslint-disable-next-line no-control-regex -- intentional non-ASCII byte check
  return /[^\x00-\x7F]/.test(text);
}

/** Loads the editor unicode font (public/fonts/NotoSans-Regular.ttf) once per save. */
export async function loadEditorFontBytes(): Promise<Uint8Array | null> {
  try {
    const res = await fetch('/fonts/NotoSans-Regular.ttf');
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function embedEditorFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  const bytes = await loadEditorFontBytes();
  if (bytes) {
    try {
      return await pdfDoc.embedFont(bytes, { subset: true });
    } catch {
      // fall through to Helvetica
    }
  }
  return pdfDoc.embedFont(StandardFonts.Helvetica);
}

interface DrawContext {
  page: PDFPage;
  scale: number;
  pdfW: number;
  pdfH: number;
  font: PDFFont;
}

function drawTextObject(obj: FabricObjectJson, ctx: DrawContext): void {
  const text = typeof obj.text === 'string' ? obj.text : '';
  if (text === '') return;
  const size = (obj.fontSize ?? 40) * (obj.scaleY ?? 1);
  const lineHeight = (obj.lineHeight ?? 1.16) * size;
  const fill = parseFabricColor(obj.fill) ?? { r: 0, g: 0, b: 0, a: 1 };
  const left = (obj.left ?? 0) / ctx.scale;
  const topPt = (obj.top ?? 0) / ctx.scale;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const baselineY = ctx.pdfH - topPt - size * 0.82 - i * lineHeight;
    ctx.page.drawText(lines[i], {
      x: left,
      y: baselineY,
      size,
      font: ctx.font,
      color: rgb(fill.r, fill.g, fill.b),
      opacity: fill.a * objOpacity(obj),
      rotate: degrees(obj.angle ?? 0),
    });
  }
}

function drawRectObject(obj: FabricObjectJson, ctx: DrawContext): void {
  const fill = parseFabricColor(obj.fill);
  const stroke = parseFabricColor(obj.stroke);
  const w = (obj.width ?? 0) * (obj.scaleX ?? 1);
  const h = (obj.height ?? 0) * (obj.scaleY ?? 1);
  const x = (obj.left ?? 0) / ctx.scale;
  const y = ctx.pdfH - ((obj.top ?? 0) + h) / ctx.scale;
  if (!fill && !stroke) return;
  ctx.page.drawRectangle({
    x,
    y,
    width: w / ctx.scale,
    height: h / ctx.scale,
    color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
    opacity: fill ? fill.a * objOpacity(obj) : undefined,
    borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
    borderOpacity: stroke ? stroke.a * objOpacity(obj) : undefined,
    borderWidth: stroke ? ((obj.strokeWidth ?? 1) * (obj.scaleX ?? 1)) / ctx.scale : undefined,
    rotate: degrees(obj.angle ?? 0),
  });
}

function drawCircleObject(obj: FabricObjectJson, ctx: DrawContext): void {
  const fill = parseFabricColor(obj.fill);
  const stroke = parseFabricColor(obj.stroke);
  if (!fill && !stroke) return;
  const rx =
    ((obj.type === 'ellipse' ? (obj.radius ?? 0) : (obj.radius ?? 0)) * (obj.scaleX ?? 1)) / ctx.scale;
  const ry = ((obj.radius ?? 0) * (obj.scaleY ?? 1)) / ctx.scale;
  const w = 2 * (obj.radius ?? 0) * (obj.scaleX ?? 1);
  const cx = ((obj.left ?? 0) + w / 2) / ctx.scale;
  const cy = ctx.pdfH - ((obj.top ?? 0) + (obj.radius ?? 0) * (obj.scaleY ?? 1)) / ctx.scale;
  ctx.page.drawEllipse({
    x: cx,
    y: cy,
    xScale: rx,
    yScale: ry,
    color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
    opacity: fill ? fill.a * objOpacity(obj) : undefined,
    borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
    borderOpacity: stroke ? stroke.a * objOpacity(obj) : undefined,
    borderWidth: stroke ? (obj.strokeWidth ?? 1) / ctx.scale : undefined,
    rotate: degrees(obj.angle ?? 0),
  });
}

function drawLineObject(obj: FabricObjectJson, ctx: DrawContext): void {
  const stroke = parseFabricColor(obj.stroke) ?? { r: 0, g: 0, b: 0, a: 1 };
  const w = (obj.width ?? 0) * (obj.scaleX ?? 1);
  const h = (obj.height ?? 0) * (obj.scaleY ?? 1);
  const x1 = (obj.left ?? 0) / ctx.scale;
  const y1 = ctx.pdfH - (obj.top ?? 0) / ctx.scale;
  const x2 = x1 + w / ctx.scale;
  const y2 = y1 - h / ctx.scale;
  ctx.page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: (obj.strokeWidth ?? 1) / ctx.scale,
    color: rgb(stroke.r, stroke.g, stroke.b),
    opacity: stroke.a * objOpacity(obj),
  });
}

function fabricPathToSvgD(path: unknown): string | null {
  if (!Array.isArray(path)) return null;
  const parts: string[] = [];
  for (const seg of path) {
    if (!Array.isArray(seg) || typeof seg[0] !== 'string') return null;
    const cmd = seg[0];
    const nums = seg.slice(1).map((n) => Number(n));
    if (nums.some((n) => !Number.isFinite(n))) return null;
    parts.push(cmd + nums.map((n) => Math.round(n * 100) / 100).join(' '));
  }
  return parts.join(' ');
}

function drawPathObject(obj: FabricObjectJson, ctx: DrawContext): void {
  const d = fabricPathToSvgD(obj.path);
  if (!d) throw new Error('unsupported path');
  const stroke = parseFabricColor(obj.stroke) ?? { r: 0, g: 0, b: 0, a: 1 };
  const w = (obj.width ?? 0) * (obj.scaleX ?? 1);
  const h = (obj.height ?? 0) * (obj.scaleY ?? 1);
  const off = obj.pathOffset ?? { x: 0, y: 0 };
  // fabric: canvasPt = localPt - pathOffset + bboxCenter
  const cx = (obj.left ?? 0) + w / 2;
  const cy = (obj.top ?? 0) + h / 2;
  ctx.page.drawSvgPath(d, {
    x: (cx - off.x) / ctx.scale,
    y: ctx.pdfH - (cy - off.y) / ctx.scale,
    scale: 1 / ctx.scale,
    borderColor: rgb(stroke.r, stroke.g, stroke.b),
    borderWidth: ((obj.strokeWidth ?? 1) * (obj.scaleX ?? 1)) / ctx.scale,
  });
}

async function drawImageObject(obj: FabricObjectJson, pdfDoc: PDFDocument, ctx: DrawContext): Promise<void> {
  if (typeof obj.src !== 'string' || !obj.src.startsWith('data:')) {
    throw new Error('unsupported image source');
  }
  const comma = obj.src.indexOf(',');
  if (comma < 0) throw new Error('unsupported image source');
  const meta = obj.src.slice(5, comma);
  const bin = atob(obj.src.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const isJpeg = meta.includes('jpeg') || meta.includes('jpg');
  const image = isJpeg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
  const w = (obj.width ?? 1) * (obj.scaleX ?? 1);
  const h = (obj.height ?? 1) * (obj.scaleY ?? 1);
  ctx.page.drawImage(image, {
    x: (obj.left ?? 0) / ctx.scale,
    y: ctx.pdfH - ((obj.top ?? 0) + h) / ctx.scale,
    width: w / ctx.scale,
    height: h / ctx.scale,
    opacity: objOpacity(obj),
    rotate: degrees(obj.angle ?? 0),
  });
}

export interface VectorDrawOptions {
  pdfDoc: PDFDocument;
  page: PDFPage;
  state: { objects?: FabricObjectJson[] } | null;
  pageWidthPt: number;
  pageHeightPt: number;
  /** canvas px per PDF pt that the fabric coords live in */
  scale: number;
  font?: PDFFont;
}

/**
 * Draws a fabric page state as vector operations.
 * Returns false when the state contains objects we cannot reproduce.
 */
export async function drawFabricStateVector(opts: VectorDrawOptions): Promise<boolean> {
  const objects = opts.state?.objects ?? [];
  if (objects.length === 0) return true;

  let font = opts.font;
  if (!font) {
    const needsFont = objects.some(
      (o) => (o.type === 'i-text' || o.type === 'text' || o.type === 'textbox') && (o.text ?? '') !== '',
    );
    if (needsFont) {
      const unicode = objects.some(
        (o) => (o.type === 'i-text' || o.type === 'text' || o.type === 'textbox') && nonAscii(o.text ?? ''),
      );
      if (unicode) {
        font = await embedEditorFont(opts.pdfDoc);
      } else {
        font = await opts.pdfDoc.embedFont(StandardFonts.Helvetica);
      }
    }
  }

  const ctx: DrawContext = {
    page: opts.page,
    scale: opts.scale,
    pdfW: opts.pageWidthPt,
    pdfH: opts.pageHeightPt,
    font: font ?? (await opts.pdfDoc.embedFont(StandardFonts.Helvetica)),
  };

  for (const obj of objects) {
    if (obj.visible === false) continue;
    if (!isSupported(obj)) return false;
    try {
      switch (obj.type) {
        case 'i-text':
        case 'text':
        case 'textbox':
          drawTextObject(obj, ctx);
          break;
        case 'rect':
          drawRectObject(obj, ctx);
          break;
        case 'circle':
        case 'ellipse':
          drawCircleObject(obj, ctx);
          break;
        case 'line':
          drawLineObject(obj, ctx);
          break;
        case 'path':
          drawPathObject(obj, ctx);
          break;
        case 'image':
          await drawImageObject(obj, opts.pdfDoc, ctx);
          break;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}
