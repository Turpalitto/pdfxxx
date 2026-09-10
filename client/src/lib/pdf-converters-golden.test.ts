import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';

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
  // Отдельные drawText → отдельные текстовые items в pdfjs → табличные ячейки.
  page1.drawText('Region', { x: 40, y: 300, size: 12, font: bold });
  page1.drawText('Q1', { x: 160, y: 300, size: 12, font: bold });
  page1.drawText('Q2', { x: 300, y: 300, size: 12, font: bold });
  page1.drawText('North', { x: 41, y: 280, size: 12, font });
  page1.drawText('120', { x: 162, y: 280, size: 12, font });
  page1.drawText('140', { x: 301, y: 280, size: 12, font });
  page1.drawText('South', { x: 40, y: 260, size: 12, font });
  page1.drawText('90', { x: 161, y: 260, size: 12, font });
  page1.drawText('95', { x: 300, y: 260, size: 12, font });
  page1.drawText('Plain paragraph body text.', { x: 40, y: 200, size: 12, color: rgb(0.8, 0, 0) });
  page1.drawText('Visit pdfx.tools portal now.', { x: 40, y: 150, size: 12, font });

  // URI-аннотация поверх строки «Visit …» (координаты PDF: origin снизу-слева).
  const linkAnnot = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [40, 146, 240, 164],
    Border: [0, 0, 0],
    A: { Type: 'Action', S: 'URI', URI: PDFString.of('https://pdfx.tools/example') },
  });
  const linkRef = doc.context.register(linkAnnot);
  page1.node.set(PDFName.of('Annots'), doc.context.obj([linkRef]));

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

  it('pdfToWord keeps table structure, run styling and hyperlinks', async () => {
    const file = await makeFixturePdf();
    const docx = await pdfToWord(file);

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(docx);
    const documentXml = await zip.file('word/document.xml')!.async('string');
    const relsXml = await zip.file('word/_rels/document.xml.rels')!.async('string');

    // Таблица: w:tbl + сетка колонок + ячейки с содержимым.
    expect(documentXml).toContain('<w:tbl>');
    expect(documentXml).toContain('<w:gridCol');
    expect(documentXml).toMatch(/<w:tc>.{0,300}North/s);
    expect(documentXml).toMatch(/<w:tc>.{0,300}120/s);

    // Цвет заливки текста (rgb(0.8,0,0) → CC0000) дошёл до run props.
    expect(documentXml).toContain('w:color w:val="cc0000"');

    // Внешняя ссылка: w:hyperlink + внешняя relationship.
    expect(documentXml).toContain('<w:hyperlink r:id="rLnk1"');
    expect(relsXml).toContain('https://pdfx.tools/example');
    expect(relsXml).toContain('TargetMode="External"');
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

    // Числа из таблицы стали числовыми ячейками, а не строками.
    const numericRow = rows.find(
      (row) => Array.isArray(row) && row.includes(120) && row.includes(140),
    );
    expect(numericRow).toBeDefined();
  });

  it('text-free pages keep the friendly OCR hint instead of crashing', async () => {
    const { PDFDocument: EmptyDoc } = await import('pdf-lib');
    const empty = await EmptyDoc.create();
    empty.addPage([595, 842]); // условный скан: ни текста, ни извлекаемого слоя
    const file = new File([await empty.save()], 'scan.pdf', { type: 'application/pdf' });

    await expect(pdfToWord(file)).rejects.toThrow(/No extractable text/);
    await expect(pdfToExcel(file)).rejects.toThrow(/No extractable content/);
  });
});
