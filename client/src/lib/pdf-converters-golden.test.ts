import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// pdfjs-dist modern build needs full browser APIs (DOMMatrix, real worker
// URL resolution, crypto hashing); run the converters on the legacy build
// under vitest/node, exactly like pdfjs itself recommends for Node.
vi.mock('pdfjs-dist', async () => await import('pdfjs-dist/legacy/build/pdf.mjs'));

const g = globalThis as Record<string, unknown>;
g.DOMMatrix ??= class DOMMatrixStub {};
g.Path2D ??= class Path2DStub {};
g.ImageData ??= class ImageDataStub {};

{
  const { pathToFileURL } = await import('node:url');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ).href;
}

const { pdfToExcel, pdfToWord } = await import('./pdf-utils');

async function makeFixturePdf(): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page1 = doc.addPage([600, 400]);
  page1.drawText('Quarterly Revenue Report', { x: 40, y: 350, size: 22, font: bold });
  page1.drawText('Region    Q1    Q2', { x: 40, y: 300, size: 12, font });
  page1.drawText('North    120    140', { x: 40, y: 280, size: 12, font });
  page1.drawText('South     90     95', { x: 40, y: 260, size: 12, font });
  page1.drawText('Plain paragraph body text.', { x: 40, y: 200, size: 12, font });

  const page2 = doc.addPage([600, 400]);
  page2.drawText('Appendix Notes', { x: 40, y: 350, size: 18, font: bold });
  page2.drawText('Secondary page content.', { x: 40, y: 300, size: 12, font });

  const bytes = await doc.save();
  return new File([bytes], 'fixture.pdf', { type: 'application/pdf' });
}

describe('converter golden checks (pdfToWord / pdfToExcel)', () => {
  it('pdfToWord keeps headings and body text in the docx', async () => {
    const file = await makeFixturePdf();
    const docx = await pdfToWord(file);

    expect(docx.byteLength).toBeGreaterThan(2000);
    const head = new TextDecoder().decode(docx.slice(0, 4));
    expect(head.startsWith('PK')).toBe(true);

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(docx);
    const documentXml = await zip.file('word/document.xml')!.async('string');

    expect(documentXml).toContain('Quarterly Revenue Report');
    expect(documentXml).toContain('Appendix Notes');
    expect(documentXml).toContain('Plain paragraph body text.');
    expect(documentXml).toContain('Secondary page content.');
    expect(documentXml).toMatch(/pStyle w:val="Heading\d"/);
  });

  it('pdfToExcel produces a workbook with table values', async () => {
    const file = await makeFixturePdf();
    const xlsx = await pdfToExcel(file);

    expect(xlsx.byteLength).toBeGreaterThan(1000);
    const head = new TextDecoder().decode(xlsx.slice(0, 4));
    expect(head.startsWith('PK')).toBe(true);

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(xlsx, { type: 'array' });
    expect(workbook.SheetNames.length).toBeGreaterThan(0);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
    const flat = JSON.stringify(rows);
    expect(flat).toContain('Quarterly Revenue Report');
    expect(flat).toMatch(/Region/);
    expect(flat).toMatch(/120/);
    expect(flat).toMatch(/140/);
  });
});
