import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  drawFabricStateVector,
  fabricFontSizeToPdf,
  parseFabricColor,
} from './edit-pdf-vector';

function makePage() {
  const doc = async () => {
    const d = await PDFDocument.create();
    const page = d.addPage([595, 842]);
    return { d, page };
  };
  return doc();
}

describe('parseFabricColor', () => {
  it('parses hex colors', () => {
    expect(parseFabricColor('#ff0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(parseFabricColor('#0f0')).toEqual({ r: 0, g: 1, b: 0, a: 1 });
  });

  it('parses rgba() colors with alpha', () => {
    expect(parseFabricColor('rgba(0, 0, 255, 0.5)')).toEqual({ r: 0, g: 0, b: 1, a: 0.5 });
  });

  it('returns null for transparent/none/garbage', () => {
    expect(parseFabricColor('transparent')).toBeNull();
    expect(parseFabricColor('none')).toBeNull();
    expect(parseFabricColor('linear-gradient(red)')).toBeNull();
  });
});

describe('fabricFontSizeToPdf', () => {
  it('converts display-canvas pixels to PDF points', () => {
    expect(fabricFontSizeToPdf(24, 1, 1.5)).toBe(16);
    expect(fabricFontSizeToPdf(24, 1.5, 1.5)).toBe(24);
  });
});

describe('drawFabricStateVector', () => {
  it('draws rect, line and ascii text and reports success', async () => {
    const { d, page } = await makePage();
    const font = await d.embedFont(StandardFonts.Helvetica);
    const ok = await drawFabricStateVector({
      pdfDoc: d,
      page,
      state: {
        objects: [
          { type: 'rect', left: 100, top: 100, width: 200, height: 80, fill: '#ffff00', opacity: 0.35 },
          { type: 'line', left: 50, top: 300, width: 100, height: 0, stroke: '#000000', strokeWidth: 2 },
          { type: 'i-text', left: 20, top: 500, text: 'Hello PDF', fontSize: 24, fill: '#000000' },
        ],
      },
      pageWidthPt: 595,
      pageHeightPt: 842,
      scale: 1.5,
      font,
    });
    expect(ok).toBe(true);
    const bytes = await d.save();
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
  });

  it('draws pencil paths', async () => {
    const { d, page } = await makePage();
    const ok = await drawFabricStateVector({
      pdfDoc: d,
      page,
      state: {
        objects: [
          {
            type: 'path',
            left: 10,
            top: 20,
            width: 100,
            height: 50,
            stroke: '#ff0000',
            strokeWidth: 3,
            pathOffset: { x: 50, y: 25 },
            path: [
              ['M', 0, 0],
              ['L', 100, 50],
            ],
          },
        ],
      },
      pageWidthPt: 595,
      pageHeightPt: 842,
      scale: 1.5,
    });
    expect(ok).toBe(true);
  });

  it('returns false for unsupported object types', async () => {
    const { d, page } = await makePage();
    const ok = await drawFabricStateVector({
      pdfDoc: d,
      page,
      state: { objects: [{ type: 'group', left: 0, top: 0 }] },
      pageWidthPt: 595,
      pageHeightPt: 842,
      scale: 1.5,
    });
    expect(ok).toBe(false);
  });

  it('skips invisible objects and handles empty state', async () => {
    const { d, page } = await makePage();
    const ok = await drawFabricStateVector({
      pdfDoc: d,
      page,
      state: { objects: [{ type: 'rect', left: 0, top: 0, width: 10, height: 10, fill: '#000', visible: false }] },
      pageWidthPt: 595,
      pageHeightPt: 842,
      scale: 1.5,
    });
    expect(ok).toBe(true);

    const empty = await drawFabricStateVector({
      pdfDoc: d,
      page,
      state: null,
      pageWidthPt: 595,
      pageHeightPt: 842,
      scale: 1.5,
    });
    expect(empty).toBe(true);
  });
});
