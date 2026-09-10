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

    // Строки таблицы идут сверху вниз (регрессия bottom-to-top ловится здесь).
    const rowOrder = ['Region', 'North', 'South'].map((t) => documentXml.indexOf(`>${t}<`));
    expect(rowOrder.every((idx) => idx >= 0)).toBe(true);
    expect([...rowOrder].sort((a, b) => a - b)).toEqual(rowOrder);

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

  it('pdfToWord reads two-column pages in column order', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([595, 842]);

    page.drawText('Two Column Report', { x: 50, y: 780, size: 18, font: bold });
    // Выровненные baselines: левая и правая строки на одинаковых y — pdfjs
    // склеивает их в merged-строки из двух ячеек. Guard ≥3 ячеек отличает это
    // от таблицы и режет обратно в reading order (см. ADR-018).
    const leftLines = ['Left line one.', 'Left line two.', 'Left line three.'];
    const rightLines = ['Right line one.', 'Right line two.', 'Right line three.'];
    leftLines.forEach((text, i) => {
      page.drawText(text, { x: 50, y: 720 - i * 22, size: 12, font });
    });
    rightLines.forEach((text, i) => {
      page.drawText(text, { x: 330, y: 720 - i * 22, size: 12, font });
    });

    const file = new File([await doc.save()], 'two-col.pdf', { type: 'application/pdf' });
    const docx = await pdfToWord(file);

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(docx);
    const documentXml = await zip.file('word/document.xml')!.async('string');

    // Reading order: заголовок, вся левая колонка, затем вся правая.
    const order = [
      'Two Column Report',
      'Left line one.',
      'Left line two.',
      'Left line three.',
      'Right line one.',
      'Right line two.',
      'Right line three.',
    ].map((text) => documentXml.indexOf(text));
    expect(order.every((idx) => idx >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    // Строки колонок не склеены в один параграф (старое поведение).
    expect(documentXml).not.toContain('Left line one. Right line one.');
  });

  it('pdfToWord converts list markers to real numbering and strips headers/footers', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    // 3 страницы с повторяющимися колонтитулами (header y≤12%, footer y≥86%
    // высоты 842 в viewport-координатах: pdf-lib y=810 → viewport y=32,
    // pdf-lib y=18 → viewport y=824).
    for (let p = 0; p < 3; p++) {
      const page = doc.addPage([595, 842]);
      page.drawText('Quarterly Digest', { x: 50, y: 810, size: 9, font });
      page.drawText('Confidential — internal use only', { x: 50, y: 18, size: 9, font });
      page.drawText(`Unique body paragraph of page ${p + 1}.`, { x: 50, y: 760, size: 12, font });
    }
    const first = doc.getPage(0);
    // Заголовок + буллеты + первая ordered-группа + разделяющий абзац +
    // вторая ordered-группа (должна получить свой numId → рестарт с 1).
    first.drawText('Release Checklist', { x: 50, y: 700, size: 22, font: bold });
    first.drawText('• Prepare assets', { x: 50, y: 660, size: 12, font });
    first.drawText('• Review draft', { x: 50, y: 640, size: 12, font });
    first.drawText('1. Ship the build', { x: 50, y: 600, size: 12, font });
    first.drawText('2. Announce release', { x: 50, y: 580, size: 12, font });
    first.drawText('Separating paragraph breaks the group.', { x: 50, y: 540, size: 12, font });
    first.drawText('1. Retrospect notes', { x: 50, y: 500, size: 12, font });
    first.drawText('2. Celebrate quietly', { x: 50, y: 480, size: 12, font });

    const file = new File([await doc.save()], 'lists-headers.pdf', { type: 'application/pdf' });
    const docx = await pdfToWord(file);

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(docx);
    const documentXml = await zip.file('word/document.xml')!.async('string');
    const numbering = zip.file('word/numbering.xml');
    const relsXml = await zip.file('word/_rels/document.xml.rels')!.async('string');
    const contentTypes = await zip.file('[Content_Types].xml')!.async('string');

    // Маркеры стали настоящими списками: w:numPr в параграфах + numbering.xml.
    expect(documentXml).toContain('<w:numPr>');
    expect(numbering).not.toBeNull();
    const numberingXml = await numbering!.async('string');
    expect(numberingXml).toContain('w:numFmt w:val="bullet"');
    expect(numberingXml).toContain('w:numFmt w:val="decimal"');
    expect(relsXml).toContain('numbering.xml');
    expect(contentTypes).toContain('/word/numbering.xml');

    // Маркер срезан из текста runs, сам текст элемента остался.
    expect(documentXml).not.toContain('• Prepare assets');
    expect(documentXml).not.toContain('>1. Ship the build');
    expect(documentXml).toContain('Prepare assets');

    // Буллеты делят numId=1; ordered-группы — numId=2 и numId=3 (рестарт).
    expect(documentXml).toContain('w:numId w:val="1"');
    expect(documentXml).toContain('w:numId w:val="2"');
    expect(documentXml).toContain('w:numId w:val="3"');
    expect(numberingXml).toContain('<w:num w:numId="3">');

    // Колонтитулы повторялись на всех 3 страницах → удалены.
    expect(documentXml).not.toContain('Quarterly Digest');
    expect(documentXml).not.toContain('Confidential');
    // Уникальное тело страниц осталось.
    expect(documentXml).toContain('Unique body paragraph of page 1.');
    expect(documentXml).toContain('Unique body paragraph of page 3.');
    expect(documentXml).toContain('Separating paragraph breaks the group.');
  });

  it('mammoth validates the docx: h1/h2, table cells and hyperlinks', async () => {
    // Mammoth — независимый «потребитель» нашего DOCX: если OOXML битый,
    // конвертация теряет структуру. Заголовок 22pt (медиана 12 → ≥1.7×) →
    // Heading1 → <h1>; подзаголовок 18pt (≥1.35×) → <h2>.
    const file = await makeFixturePdf();
    const docx = await pdfToWord(file);

    const mammoth = await import('mammoth');
    const html = (await mammoth.convertToHtml({ buffer: Buffer.from(docx) })).value;

    expect(html).toContain('<h1>Quarterly Revenue Report</h1>');
    expect(html).toContain('<h2>Appendix Notes</h2>');

    // Таблица: mammoth оборачивает текст ячеек в <p> (поэтому '<td><p>').
    expect(html).toContain('<table>');
    expect(html).toContain('<td><p>North</p></td>');
    expect(html).toContain('<td><p>South</p></td>');

    // Внешняя ссылка стала <a href>.
    expect(html).toContain('<a href="https://pdfx.tools/example">');
  });

  it('mammoth converts numbering lists to real ul/ol markup', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([595, 842]);
    // 21pt+ (mediana-опасность: при <21 и медиане 12 ловим h2 вместо h1).
    page.drawText('Launch Plan', { x: 50, y: 780, size: 22, font: bold });
    page.drawText('• Prepare assets', { x: 50, y: 740, size: 12, font });
    page.drawText('• Review draft', { x: 50, y: 720, size: 12, font });
    page.drawText('1. Ship the build', { x: 50, y: 680, size: 12, font });
    page.drawText('2. Announce release', { x: 50, y: 660, size: 12, font });

    const file = new File([await doc.save()], 'lists-mammoth.pdf', { type: 'application/pdf' });
    const docx = await pdfToWord(file);

    const mammoth = await import('mammoth');
    const html = (await mammoth.convertToHtml({ buffer: Buffer.from(docx) })).value;

    expect(html).toContain('<h1>Launch Plan</h1>');
    expect(html).toContain('<ul><li>Prepare assets</li><li>Review draft</li></ul>');
    expect(html).toContain('<ol><li>Ship the build</li><li>Announce release</li></ol>');
  });

  it('pdfToExcel keeps the flat row path (no column splitting)', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);
    // Две строки: детект таблиц требует ≥2 подряд табличных строк.
    page.drawText('Left cell', { x: 50, y: 700, size: 12, font });
    page.drawText('Right cell', { x: 330, y: 700, size: 12, font });
    page.drawText('Left two', { x: 51, y: 680, size: 12, font });
    page.drawText('Right two', { x: 331, y: 680, size: 12, font });

    const file = new File([await doc.save()], 'two-col-flat.pdf', { type: 'application/pdf' });
    const xlsx = await pdfToExcel(file);

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(xlsx, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    // Ячейки одной визуальной строки остаются в одной строке листа.
    expect(rows.some((row) => row.includes('Left cell') && row.includes('Right cell'))).toBe(true);
    expect(rows.some((row) => row.includes('Left two') && row.includes('Right two'))).toBe(true);
  });
});
