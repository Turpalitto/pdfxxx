import { expect, test, type Page } from '@playwright/test';
import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import { readFile } from 'node:fs/promises';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

async function fixturePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  ['Document conversion', '3) First item', '4) Second item', '• Bullet item'].forEach((text, i) => {
    page.drawText(text, { x: 50, y: 760 - i * 35, size: 12, font });
  });
  return Buffer.from(await doc.save());
}

async function convert(page: Page, slug: string, buffer: Buffer, name: string): Promise<Buffer> {
  await page.goto(`/tools/${slug}`);
  await page.getByTestId('input-file-hidden').setInputFiles({
    name,
    mimeType: name.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  });
  await page.getByTestId('button-process').click();
  await expect(page.getByTestId('button-download')).toBeVisible({ timeout: 45_000 });
  const downloading = page.waitForEvent('download');
  await page.getByTestId('button-download').click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(
    new RegExp(`\\.${slug === 'pdf-to-word' ? 'docx' : slug === 'pdf-to-excel' ? 'xlsx' : 'pdf'}$`),
  );
  return readFile((await download.path())!);
}

for (const slug of ['pdf-to-word', 'pdf-to-excel']) {
  test(`${slug} produces a valid document in the actual worker without fallback`, async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('falling back to main thread')) warnings.push(message.text());
    });
    const worker = page.waitForEvent('worker', {
      predicate: (worker) => /\/pdf-worker\./.test(worker.url()),
    });
    const bytes = await convert(page, slug, await fixturePdf(), 'lists.pdf');
    expect(await worker).toBeTruthy();
    expect(warnings).toEqual([]);
    const entries = unzipSync(bytes);
    if (slug === 'pdf-to-word') {
      expect(strFromU8(entries['word/document.xml'])).toContain('<w:numPr>');
      expect(strFromU8(entries['word/numbering.xml'])).toContain('<w:startOverride w:val="3"/>');
    } else {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(bytes, { type: 'buffer' });
      expect(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]])).toContain(
        'First item',
      );
    }
  });

  test(`${slug} still converts when OffscreenCanvas is unavailable`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'OffscreenCanvas', { value: undefined, configurable: true });
    });
    const workers: string[] = [];
    page.on('worker', (worker) => workers.push(worker.url()));
    const bytes = await convert(page, slug, await fixturePdf(), 'fallback.pdf');
    expect(Object.keys(unzipSync(bytes))).toContain('[Content_Types].xml');
    expect(workers.filter((url) => /\/pdf-worker\./.test(url))).toEqual([]);
  });
}

function fixtureDocx(): Buffer {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const paragraph = (text: string, props = '') =>
    `<w:p><w:pPr>${props}</w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
  const list = (id: number) => `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${id}"/></w:numPr>`;
  const body = [
    paragraph('Conversion heading', '<w:pStyle w:val="Heading1"/>'),
    paragraph('Body &amp; entities &lt;stay&gt; readable.'),
    paragraph('Первый пункт', list(1)),
    paragraph('Второй пункт', list(1)),
    paragraph('Маркированный пункт', list(2)),
    paragraph('https://example.com/' + 'long'.repeat(90)),
    ...Array.from({ length: 55 }, (_, i) => paragraph(`Paragraph ${i + 1} for pagination.`)),
  ].join('');
  return Buffer.from(
    zipSync({
      '[Content_Types].xml': strToU8(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      ),
      '_rels/.rels': strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
      'word/document.xml': strToU8(
        `<w:document xmlns:w="${ns}"><w:body>${body}</w:body></w:document>`,
      ),
      'word/styles.xml': strToU8(
        `<w:styles xmlns:w="${ns}"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/></w:style></w:styles>`,
      ),
      'word/numbering.xml': strToU8(
        `<w:numbering xmlns:w="${ns}"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="3"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>`,
      ),
    }),
  );
}

test('Word to PDF preserves headings, list markers, Cyrillic and paginates within margins', async ({
  page,
}) => {
  const bytes = await convert(page, 'word-to-pdf', fixtureDocx(), 'formatted.docx');
  const result = await page.evaluate(async (bytes) => {
    const modulePath = '/src/lib/pdf-utils.ts';
    const { loadPdfJs } = await import(/* @vite-ignore */ modulePath);
    const pdfjs = await loadPdfJs();
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    const doc = await task.promise;
    const items: { text: string; size: number; x: number; right: number; y: number }[] = [];
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const content = await (await doc.getPage(i)).getTextContent();
        for (const item of content.items) {
          if (!('str' in item) || !item.str.trim()) continue;
          items.push({
            text: item.str,
            size: item.height,
            x: item.transform[4],
            right: item.transform[4] + item.width,
            y: item.transform[5],
          });
        }
      }
      return { pages: doc.numPages, items };
    } finally {
      await task.destroy();
    }
  }, Array.from(bytes));
  const text = result.items.map((item) => item.text).join(' ');
  expect(text).toContain('Первый пункт');
  expect(text).toContain('Второй пункт');
  expect(text).toContain('Маркированный пункт');
  expect(text).toContain('3.');
  expect(text).toContain('4.');
  expect(text).toContain('•');
  expect(text).toContain('Body & entities <stay> readable.');
  expect(result.items.find((item) => item.text === 'Conversion heading')?.size).toBeGreaterThan(18);
  expect(result.pages).toBeGreaterThan(1);
  expect(
    result.items.every(
      (item) => item.x >= 49 && item.right <= 546 && item.y >= 49 && item.y <= 793,
    ),
  ).toBe(true);
  expect(text).toContain('Paragraph 55 for pagination.');
});

function numberingRegressionDocx(): Buffer {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const p = (text: string, id: number, level = 0, reference = '') =>
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${id}"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t>${reference}</w:r></w:p>`;
  const level = (index: number, format: string, start: number, pattern: string, extra = '') =>
    `<w:lvl w:ilvl="${index}"><w:start w:val="${start}"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${pattern}"/>${extra}</w:lvl>`;
  const definitions = [
    level(0, 'decimal', 3, '%1.'),
    level(0, 'upperRoman', 3, '%1.'),
    level(0, 'lowerLetter', 26, '%1)'),
    level(0, 'upperLetter', 26, '%1)'),
    level(0, 'lowerRoman', 3, '%1.'),
    level(0, 'upperRoman', 2, '%1.') +
      level(1, 'lowerLetter', 3, '%1.%2)') +
      level(2, 'decimal', 1, '%1.%2.%3.', '<w:isLgl/>'),
    level(0, 'decimal', 1, '%1.') + level(1, 'decimal', 1, '%1.%2.', '<w:lvlRestart w:val="0"/>'),
    level(0, 'upperRoman', 1, '%1.'),
  ];
  const body = [
    p('Decimal first', 1, 0, '<w:footnoteReference w:id="1"/>'),
    p('Decimal second', 1, 0, '<w:endnoteReference w:id="1"/>'),
    p('Roman first', 2),
    p('Roman second', 2),
    p('Letter first', 3),
    p('Letter second', 3),
    p('Letter third', 3),
    p('Capital first', 4),
    p('Capital second', 4),
    p('Capital third', 4),
    p('Small Roman first', 5),
    p('Small Roman second', 5),
    p('Parent first', 6),
    p('Child first', 6, 1),
    p('Child second', 6, 1),
    p('Parent second', 6),
    p('Child restarted', 6, 1),
    p('Legal child', 6, 2),
    p('Continuous parent first', 7),
    p('Continuous child first', 7, 1),
    p('Continuous parent second', 7),
    p('Continuous child second', 7, 1),
    '<w:p><w:r><w:t>Repeated text</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="InheritedList"/></w:pPr><w:r><w:t>Repeated text</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="InheritedList"/></w:pPr><w:r><w:t>Styled second</w:t></w:r></w:p>',
  ].join('');
  return Buffer.from(
    zipSync({
      '[Content_Types].xml': strToU8(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
      ),
      '_rels/.rels': strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
      'word/document.xml': strToU8(
        `<w:document xmlns:w="${ns}"><w:body>${body}</w:body></w:document>`,
      ),
      'word/styles.xml': strToU8(
        `<w:styles xmlns:w="${ns}"><w:style w:type="paragraph" w:styleId="ListBase"><w:name w:val="List base"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="8"/></w:numPr></w:pPr></w:style><w:style w:type="paragraph" w:styleId="InheritedList"><w:name w:val="Inherited list"/><w:basedOn w:val="ListBase"/></w:style></w:styles>`,
      ),
      'word/_rels/document.xml.rels': strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rNote" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/><Relationship Id="rEnd" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml"/></Relationships>',
      ),
      'word/numbering.xml': strToU8(
        `<w:numbering xmlns:w="${ns}">${definitions.map((levels, i) => `<w:abstractNum w:abstractNumId="${i}">${levels}</w:abstractNum>`).join('')}${definitions.map((_, i) => `<w:num w:numId="${i + 1}"><w:abstractNumId w:val="${i}"/>${i === 7 ? '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="5"/></w:lvlOverride>' : ''}</w:num>`).join('')}</w:numbering>`,
      ),
      'word/footnotes.xml': strToU8(
        `<w:footnotes xmlns:w="${ns}"><w:footnote w:id="1"><w:p><w:r><w:t>Footnote survives.</w:t></w:r></w:p></w:footnote></w:footnotes>`,
      ),
      'word/endnotes.xml': strToU8(
        `<w:endnotes xmlns:w="${ns}"><w:endnote w:id="1"><w:p><w:r><w:t>Endnote survives.</w:t></w:r></w:p></w:endnote></w:endnotes>`,
      ),
    }),
  );
}

test('Word numbering preserves source formats and starts independently of footnotes', async ({
  page,
}) => {
  const bytes = await convert(page, 'word-to-pdf', numberingRegressionDocx(), 'numbering.docx');
  const text = await page.evaluate(async (bytes) => {
    const modulePath = '/src/lib/pdf-utils.ts';
    const { loadPdfJs } = await import(/* @vite-ignore */ modulePath);
    const pdfjs = await loadPdfJs();
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    try {
      const doc = await task.promise;
      const lines: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const content = await (await doc.getPage(i)).getTextContent();
        lines.push(content.items.map((item: { str?: string }) => item.str ?? '').join(' '));
      }
      return lines.join(' ').replace(/\s+/g, ' ');
    } finally {
      await task.destroy();
    }
  }, Array.from(bytes));
  for (const expected of [
    '3. Decimal first',
    '4. Decimal second',
    'III. Roman first',
    'IV. Roman second',
    'z) Letter first',
    'aa) Letter second',
    'bb) Letter third',
    'Z) Capital first',
    'AA) Capital second',
    'BB) Capital third',
    'iii. Small Roman first',
    'iv. Small Roman second',
    'II. Parent first',
    'II.c) Child first',
    'II.d) Child second',
    'III. Parent second',
    'III.c) Child restarted',
    '3.3.1. Legal child',
    '1.1. Continuous child first',
    '2.2. Continuous child second',
    'Repeated text V. Repeated text VI. Styled second',
    'Footnote survives.',
    'Endnote survives.',
  ])
    expect(text).toContain(expected);
});

for (const lang of ['en', 'ru']) {
  test(`React error boundary offers recovery in ${lang} and keeps navigation visible`, async ({
    page,
  }) => {
    await page.addInitScript((lang) => localStorage.setItem('pdfx-lang', lang), lang);
    await page.route('**/src/pages/privacy.tsx*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: 'export default function Privacy() { throw new Error("private-document-content"); }',
      }),
    );
    await page.goto('/privacy');
    await expect(
      page.getByRole('heading', {
        name: lang === 'ru' ? 'Не удалось открыть страницу' : 'Unable to open this page',
      }),
    ).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: lang === 'ru' ? 'Перезагрузить' : 'Reload page',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).not.toContainText('private-document-content');
    await page
      .getByRole('link', { name: lang === 'ru' ? 'На главную' : 'Go home', exact: true })
      .click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByTestId('input-tool-search')).toBeVisible();
  });
}
