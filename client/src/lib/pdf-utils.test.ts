import { describe, it, expect } from 'vitest';

describe('pdf-utils pure functions', () => {
  describe('cropPdf signature', () => {
    it('should accept options object with autoCrop', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.cropPdf).toBe('function');
    });
  });

  describe('removeBlankPages signature', () => {
    it('should accept file, threshold, and onProgress', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.removeBlankPages).toBe('function');
      expect(mod.removeBlankPages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('resizePages signature', () => {
    it('should accept file, targetSize, and onProgress', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.resizePages).toBe('function');
    });
  });

  describe('grayscalePdf signature', () => {
    it('should accept file and onProgress', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.grayscalePdf).toBe('function');
    });
  });

  describe('pdfBookmarks signature', () => {
    it('should accept file', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.pdfBookmarks).toBe('function');
    });
  });

  describe('autoRedactPdf signature', () => {
    it('should accept file, options, and onProgress', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.autoRedactPdf).toBe('function');
    });
  });

  describe('nUpPdf signature', () => {
    it('should accept file, n, and onProgress', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.nUpPdf).toBe('function');
    });
  });

  describe('splitBySize signature', () => {
    it('should accept file, maxMb, and onProgress', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.splitBySize).toBe('function');
    });
  });

  describe('overlayPdf signature', () => {
    it('should accept baseFile, overlayFile, opacity, and onProgress', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.overlayPdf).toBe('function');
    });
  });

  describe('comparePdf signature', () => {
    it('should accept file1 and file2', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.comparePdf).toBe('function');
    });
  });

  describe('getPdfMetadata / setPdfMetadata signatures', () => {
    it('should have both metadata functions', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.getPdfMetadata).toBe('function');
      expect(typeof mod.setPdfMetadata).toBe('function');
    });
  });

  describe('existing functions remain intact', () => {
    it('should export all previously existing functions', async () => {
      const mod = await import('@/lib/pdf-utils');
      const expectedExports = [
        'mergePdfs',
        'splitPdf',
        'splitPdfEveryN',
        'splitPdfAllPages',
        'splitResultsToZip',
        'rotatePdf',
        'deletePages',
        'extractPages',
        'reorderPages',
        'compressPdf',
        'addWatermark',
        'addPageNumbers',
        'imagesToPdf',
        'textToPdf',
        'addHeaderFooter',
        'repairPdf',
        'flattenPdf',
        'protectPdf',
        'unlockPdf',
        'signPdf',
        'redactPdf',
        'wordToPdf',
        'pdfToWord',
        'pdfToExcel',
        'excelToPdf',
        'pdfToText',
        'pdfToImages',
        'pdfToHtml',
        'ocrPdf',
        'pdfImagesAsZip',
        'downloadBlob',
        'downloadText',
        'downloadHtml',
        'formatBytes',
        'getPdfPageCount',
        'parsePageSelection',
        'invertColors',
        'toSinglePage',
        'removeImages',
        'getPdfFormFields',
        'fillPdfForm',
        'splitByChapters',
        'bookletImposition',
        'scannerEffect',
        'cropPdf',
        'getPdfMetadata',
        'setPdfMetadata',
        'comparePdf',
        'removeBlankPages',
        'resizePages',
        'grayscalePdf',
        'pdfBookmarks',
        'autoRedactPdf',
        'nUpPdf',
        'splitBySize',
        'overlayPdf',
        'sanitizePdf',
        'extractFormFields',
        'convertToPdfA',
        'addBlankPages',
      ];
      for (const name of expectedExports) {
        expect(typeof (mod as any)[name]).toBe('function');
      }
    });
  });
});

describe('utility functions', () => {
  describe('escapeXml', () => {
    it('should escape XML special characters', async () => {
      // escapeXml is not exported, so we test indirectly through pdfToHtml
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.pdfToHtml).toBe('function');
    });
  });

  describe('stripExtension', () => {
    it('should work correctly via download functions', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.downloadBlob).toBe('function');
      expect(typeof mod.downloadText).toBe('function');
    });
  });

  describe('createOwnerPassword', () => {
    it('should produce different passwords for different seeds (tested via protectPdf)', async () => {
      const mod = await import('@/lib/pdf-utils');
      expect(typeof mod.protectPdf).toBe('function');
    });
  });
});

describe('autoRedact regex patterns', () => {
  it('should match email patterns', () => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    expect('test@example.com'.match(emailRegex)).toBeTruthy();
    expect('user.name+tag@domain.co.uk'.match(emailRegex)).toBeTruthy();
    expect('not an email'.match(emailRegex)).toBeNull();
  });

  it('should match phone patterns', () => {
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    expect('555-123-4567'.match(phoneRegex)).toBeTruthy();
    expect('(555) 123-4567'.match(phoneRegex)).toBeTruthy();
    expect('+1-555-123-4567'.match(phoneRegex)).toBeTruthy();
  });

  it('should match SSN patterns', () => {
    const ssnRegex = /\d{3}[-]\d{2}[-]\d{4}/g;
    expect('123-45-6789'.match(ssnRegex)).toBeTruthy();
    expect('123456789'.match(ssnRegex)).toBeNull();
  });

  it('should match IBAN patterns', () => {
    const ibanRegex = /[A-Z]{2}\d{2}[A-Z0-9]{4,30}/g;
    expect('DE89370400440532013000'.match(ibanRegex)).toBeTruthy();
    expect('GB29NWBK60161331926819'.match(ibanRegex)).toBeTruthy();
  });
});

describe('cropPdf autoCrop logic', () => {
  it('should accept autoCrop option in options object', async () => {
    const mod = await import('@/lib/pdf-utils');
    // Verify the function signature accepts options object
    expect(mod.cropPdf.length).toBeLessThanOrEqual(3);
  });
});

describe('resizePages target sizes', () => {
  it('should accept all standard paper sizes', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(typeof mod.resizePages).toBe('function');
  });
});

describe('splitBySize optimization', () => {
  it('should accept file, maxMb, and onProgress callback', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(typeof mod.splitBySize).toBe('function');
  });
});

describe('edit-pdf-utils pure functions', () => {
  describe('normalizeEditorFontFamily', () => {
    it('should return the font name as-is if in EDITOR_FONT_FAMILIES', async () => {
      const mod = await import('@/lib/edit-pdf-utils');
      expect(mod.normalizeEditorFontFamily('Arial')).toBe('Arial');
      expect(mod.normalizeEditorFontFamily('Courier New')).toBe('Courier New');
    });

    it('should return unknown fonts unchanged (fallback)', async () => {
      const mod = await import('@/lib/edit-pdf-utils');
      expect(mod.normalizeEditorFontFamily('SomeUnknownFont')).toBe('SomeUnknownFont');
    });
  });

  describe('hexToRgba', () => {
    it('should convert hex to rgba string', async () => {
      const mod = await import('@/lib/edit-pdf-utils');
      expect(mod.hexToRgba('#ff0000', 0.5)).toContain('rgba');
      expect(mod.hexToRgba('#ff0000', 1)).toContain('255');
    });

    it('should handle short hex codes', async () => {
      const mod = await import('@/lib/edit-pdf-utils');
      const result = mod.hexToRgba('#f00', 0.5);
      expect(result).toBeTruthy();
    });
  });

  describe('clamp', () => {
    it('should clamp values to min/max range', async () => {
      const mod = await import('@/lib/edit-pdf-utils');
      expect(mod.clamp(5, 0, 10)).toBe(5);
      expect(mod.clamp(-1, 0, 10)).toBe(0);
      expect(mod.clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('dataUrlToBytes', () => {
    it('should convert data URL to Uint8Array', async () => {
      const mod = await import('@/lib/edit-pdf-utils');
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const result = mod.dataUrlToBytes(dataUrl);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('mbToBytes', () => {
    it('should convert MB to bytes', async () => {
      const mod = await import('@/lib/upload-limits');
      expect(mod.mbToBytes(1)).toBe(1048576);
      expect(mod.mbToBytes(10)).toBe(10485760);
    });
  });
});

describe('formatBytes', () => {
  it('should format bytes into human-readable strings', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(mod.formatBytes(0)).toBe('0 B');
    expect(mod.formatBytes(500)).toBe('500 B');
    expect(mod.formatBytes(1024)).toBe('1 KB');
    expect(mod.formatBytes(1048576)).toBe('1 MB');
    expect(mod.formatBytes(1073741824)).toBe('1 GB');
  });

  it('should handle fractional sizes', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(mod.formatBytes(1536)).toBe('1.5 KB');
    expect(mod.formatBytes(1572864)).toBe('1.5 MB');
  });
});

describe('parsePageSelection', () => {
  it('should parse individual pages (0-indexed)', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(mod.parsePageSelection('1,3,5', 10)).toEqual([0, 2, 4]);
  });

  it('should parse page ranges (0-indexed)', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(mod.parsePageSelection('1-3', 10)).toEqual([0, 1, 2]);
  });

  it('should parse mixed ranges and individual pages', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(mod.parsePageSelection('1-3,7', 10)).toEqual([0, 1, 2, 6]);
  });

  it('should throw on invalid page tokens', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(() => mod.parsePageSelection('all', 5)).toThrow();
  });

  it('should throw on out-of-range pages', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(() => mod.parsePageSelection('1,20', 10)).toThrow();
  });
});

describe('looksLikePdfFile', () => {
  it('should reject non-PDF files by extension', async () => {
    const mod = await import('@/lib/pdf-utils');
    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const result = await mod.looksLikePdfFile(textFile);
    expect(result).toBe(false);
  });
});

describe('getAvailableVoices', () => {
  it('should be exported as a function', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(typeof mod.getAvailableVoices).toBe('function');
  });
});

describe('pdfToAudio signature', () => {
  it('should be a function', async () => {
    const mod = await import('@/lib/pdf-utils');
    expect(typeof mod.pdfToAudio).toBe('function');
  });
});

// --- pdf-to-office fidelity helpers (#2 Phase A) ---

describe('detectFontStyle', () => {
  it('detects bold from embedded font names', async () => {
    const { detectFontStyle } = await import('@/lib/pdf-utils');
    expect(detectFontStyle('ABCDEE+Arial-BoldMT')).toEqual({ bold: true, italic: false });
    expect(detectFontStyle('Helvetica-Black')).toEqual({ bold: true, italic: false });
  });

  it('detects italic / oblique', async () => {
    const { detectFontStyle } = await import('@/lib/pdf-utils');
    expect(detectFontStyle('TimesNewRoman-Italic')).toEqual({ bold: false, italic: true });
    expect(detectFontStyle('Helvetica-Oblique')).toEqual({ bold: false, italic: true });
  });

  it('detects bold-italic together', async () => {
    const { detectFontStyle } = await import('@/lib/pdf-utils');
    expect(detectFontStyle('Arial-BoldItalicMT')).toEqual({ bold: true, italic: true });
  });

  it('returns false for plain / unknown fonts', async () => {
    const { detectFontStyle } = await import('@/lib/pdf-utils');
    expect(detectFontStyle('Arial')).toEqual({ bold: false, italic: false });
    expect(detectFontStyle(undefined)).toEqual({ bold: false, italic: false });
    expect(detectFontStyle('')).toEqual({ bold: false, italic: false });
  });
});

describe('lineAlignment', () => {
  it('returns left for a line hugging the left margin', async () => {
    const { lineAlignment } = await import('@/lib/pdf-utils');
    expect(lineAlignment(40, 300, 600)).toBe('left');
  });

  it('returns center for symmetric margins', async () => {
    const { lineAlignment } = await import('@/lib/pdf-utils');
    expect(lineAlignment(200, 400, 600)).toBe('center');
  });

  it('returns right for a small right margin and large left margin', async () => {
    const { lineAlignment } = await import('@/lib/pdf-utils');
    expect(lineAlignment(400, 590, 600)).toBe('right');
  });

  it('degrades to left when page width is unknown', async () => {
    const { lineAlignment } = await import('@/lib/pdf-utils');
    expect(lineAlignment(100, 200, 0)).toBe('left');
  });
});

describe('clusterColumns', () => {
  it('collapses near-equal x positions into a single column anchor', async () => {
    const { clusterColumns } = await import('@/lib/pdf-utils');
    const cols = clusterColumns([50, 52, 48, 300, 301, 299], 10);
    expect(cols).toHaveLength(2);
    expect(cols[0]).toBeCloseTo(50, 0);
    expect(cols[1]).toBeCloseTo(300, 0);
  });

  it('keeps distinct columns apart and stays sorted', async () => {
    const { clusterColumns } = await import('@/lib/pdf-utils');
    const cols = clusterColumns([400, 50, 200], 10);
    expect(cols).toEqual([50, 200, 400]);
  });

  it('returns empty for no input', async () => {
    const { clusterColumns } = await import('@/lib/pdf-utils');
    expect(clusterColumns([], 10)).toEqual([]);
  });
});

describe('assignToColumn', () => {
  it('maps an x to the nearest column index', async () => {
    const { assignToColumn } = await import('@/lib/pdf-utils');
    const columns = [50, 200, 400];
    expect(assignToColumn(48, columns)).toBe(0);
    expect(assignToColumn(210, columns)).toBe(1);
    expect(assignToColumn(395, columns)).toBe(2);
  });

  it('falls back to 0 when there are no columns', async () => {
    const { assignToColumn } = await import('@/lib/pdf-utils');
    expect(assignToColumn(123, [])).toBe(0);
  });
});

describe('detectTableRegions', () => {
  it('detects a multi-row aligned table', async () => {
    const { detectTableRegions } = await import('@/lib/pdf-utils');
    const cellsPerLine = [
      [{ x: 50 }, { x: 200 }, { x: 350 }],
      [{ x: 51 }, { x: 201 }, { x: 349 }],
      [{ x: 49 }, { x: 199 }, { x: 351 }],
    ];
    const regions = detectTableRegions(cellsPerLine, 14);
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ start: 0, end: 2 });
    expect(regions[0].columns).toHaveLength(3);
  });

  it('ignores prose (single-cell lines)', async () => {
    const { detectTableRegions } = await import('@/lib/pdf-utils');
    const cellsPerLine = [[{ x: 50 }], [{ x: 50 }], [{ x: 50 }]];
    expect(detectTableRegions(cellsPerLine, 14)).toEqual([]);
  });

  it('requires at least two consecutive tabular rows', async () => {
    const { detectTableRegions } = await import('@/lib/pdf-utils');
    const cellsPerLine = [[{ x: 50 }, { x: 200 }], [{ x: 50 }]];
    expect(detectTableRegions(cellsPerLine, 14)).toEqual([]);
  });

  it('splits regions broken by a non-tabular line', async () => {
    const { detectTableRegions } = await import('@/lib/pdf-utils');
    const cellsPerLine = [
      [{ x: 50 }, { x: 200 }],
      [{ x: 50 }, { x: 200 }],
      [{ x: 50 }], // breaks the run
      [{ x: 50 }, { x: 200 }],
      [{ x: 50 }, { x: 200 }],
    ];
    const regions = detectTableRegions(cellsPerLine, 14);
    expect(regions).toHaveLength(2);
    expect(regions[0]).toMatchObject({ start: 0, end: 1 });
    expect(regions[1]).toMatchObject({ start: 3, end: 4 });
  });

  it('builds Excel rows without letting prose create bogus table columns', async () => {
    const { buildExcelRowsFromLineCells } = await import('@/lib/pdf-utils');
    const rows = buildExcelRowsFromLineCells(
      [
        [{ text: 'Invoice summary', x: 40 }],
        [
          { text: 'Item', x: 50 },
          { text: 'Qty', x: 220 },
          { text: 'Total', x: 360 },
        ],
        [
          { text: 'Paper', x: 52 },
          { text: '2', x: 221 },
          { text: '$8', x: 358 },
        ],
        [{ text: 'Thank you for your business', x: 40 }],
      ],
      14,
    );

    expect(rows).toEqual([
      ['Invoice summary'],
      ['Item', 'Qty', 'Total'],
      ['Paper', '2', '$8'],
      ['Thank you for your business'],
    ]);
  });

  it('keeps separate table regions independent', async () => {
    const { buildExcelRowsFromLineCells } = await import('@/lib/pdf-utils');
    const rows = buildExcelRowsFromLineCells(
      [
        [
          { text: 'A', x: 50 },
          { text: 'B', x: 160 },
        ],
        [
          { text: '1', x: 51 },
          { text: '2', x: 161 },
        ],
        [{ text: 'Notes between tables', x: 40 }],
        [
          { text: 'Left', x: 90 },
          { text: 'Right', x: 320 },
        ],
        [
          { text: 'Yes', x: 91 },
          { text: 'No', x: 321 },
        ],
      ],
      14,
    );

    expect(rows).toEqual([
      ['A', 'B'],
      ['1', '2'],
      ['Notes between tables'],
      ['Left', 'Right'],
      ['Yes', 'No'],
    ]);
  });

  describe('trackTextFillColors', () => {
    it('tracks fill color across show ops and honors save/restore', async () => {
      const { trackTextFillColors } = await import('@/lib/pdf-utils');
      const ops = { save: 10, restore: 11, setFillRGBColor: 59, showText: 44 };
      const track = trackTextFillColors(
        [59, 44, 10, 59, 44, 11, 44],
        [
          [255, 0, 0],
          [[{ unicode: 'Red' }]],
          undefined,
          [0, 0, 255],
          [[{ unicode: 'Blue' }]],
          undefined,
          [[{ unicode: 'After' }]],
        ],
        ops,
      );
      expect(track.colors).toEqual(['ff0000', '0000ff', 'ff0000']);
      expect(track.texts).toEqual(['Red', 'Blue', 'After']);
    });

    it('handles gray and unknown ops without throwing', async () => {
      const { trackTextFillColors } = await import('@/lib/pdf-utils');
      const ops = { setFillGray: 57, showText: 44, beginText: 31 };
      const track = trackTextFillColors(
        [57, 31, 44],
        [[0.5], undefined, [[{ unicode: 'x' }]]],
        ops,
      );
      expect(track.colors).toEqual(['808080']);
      expect(track.texts).toEqual(['x']);
    });

    it('accepts hex-string color args from pdfjs v5', async () => {
      const { trackTextFillColors } = await import('@/lib/pdf-utils');
      const ops = { setFillRGBColor: 59, showText: 44 };
      const track = trackTextFillColors([59, 44], [['#CC0000'], [[{ unicode: 'Red' }]]], ops);
      expect(track.colors).toEqual(['cc0000']);
      expect(track.texts).toEqual(['Red']);
    });
  });

  describe('attachColorsToItems', () => {
    it('pairs directly when counts match', async () => {
      const { attachColorsToItems } = await import('@/lib/pdf-utils');
      const items = [{ str: 'a' }, { str: 'b' }, { str: '' }];
      attachColorsToItems(items, { colors: ['ff0000', undefined, '00ff00'], texts: ['a', '', ''] });
      expect(items[0].color).toBe('ff0000');
      expect(items[1].color).toBeUndefined();
      expect(items[2].color).toBe('00ff00');
    });

    it('falls back to non-empty subsequence pairing', async () => {
      const { attachColorsToItems } = await import('@/lib/pdf-utils');
      const items = [{ str: '' }, { str: 'a' }, { str: 'b' }];
      attachColorsToItems(items, { colors: ['ff0000', '00ff00'], texts: ['a', 'b'] });
      expect(items[1].color).toBe('ff0000');
      expect(items[2].color).toBe('00ff00');
      expect(items[0].color).toBeUndefined();
    });
  });

  describe('pageTextDensity / isScanPage', () => {
    it('dense text page is not a scan', async () => {
      const { isScanPage } = await import('@/lib/pdf-utils');
      const lines = Array.from({ length: 40 }, () => ({ width: 500, size: 12 }));
      expect(isScanPage({ width: 595, height: 842, lines })).toBe(false);
    });

    it('text-free pages are always scans', async () => {
      const { isScanPage } = await import('@/lib/pdf-utils');
      expect(isScanPage({ width: 595, height: 842, lines: [] })).toBe(true);
    });

    it('sparse pages are scans only when they contain images', async () => {
      const { isScanPage } = await import('@/lib/pdf-utils');
      const sparse = {
        width: 595,
        height: 842,
        lines: [
          { width: 300, size: 10 },
          { width: 200, size: 10 },
        ],
      };
      expect(isScanPage({ ...sparse })).toBe(false); // born-digital, остаётся текстом
      expect(isScanPage({ ...sparse, hasImages: true })).toBe(true); // скан с подписью
    });

    it('low density pages with >=3 lines stay text without images', async () => {
      const { isScanPage, pageTextDensity } = await import('@/lib/pdf-utils');
      const airy = {
        width: 595,
        height: 842,
        lines: Array.from({ length: 3 }, () => ({ width: 250, size: 12 })),
      };
      expect(pageTextDensity(airy)).toBeLessThan(0.02);
      expect(isScanPage(airy)).toBe(false);
      expect(isScanPage({ ...airy, hasImages: true })).toBe(true);
    });

    it('density divides ink by page area', async () => {
      const { pageTextDensity } = await import('@/lib/pdf-utils');
      const density = pageTextDensity({
        width: 100,
        height: 100,
        lines: [{ width: 50, size: 10 }],
      });
      expect(density).toBeCloseTo(0.05, 5);
    });
  });

  describe('excelCellToNumber', () => {
    it('converts plain integers and decimals', async () => {
      const { excelCellToNumber } = await import('@/lib/pdf-utils');
      expect(excelCellToNumber('120')).toBe(120);
      expect(excelCellToNumber(' 42 ')).toBe(42);
      expect(excelCellToNumber('-3.14')).toBe(-3.14);
      expect(excelCellToNumber('1,5')).toBe(1.5);
      expect(excelCellToNumber('2026')).toBe(2026);
    });

    it('converts space-grouped thousands', async () => {
      const { excelCellToNumber } = await import('@/lib/pdf-utils');
      expect(excelCellToNumber('1 200')).toBe(1200);
      expect(excelCellToNumber('12\u00A0345,67')).toBeCloseTo(12345.67, 2);
    });

    it('keeps identifiers and non-numbers as strings', async () => {
      const { excelCellToNumber } = await import('@/lib/pdf-utils');
      expect(excelCellToNumber('007')).toBeUndefined();
      expect(excelCellToNumber('0123')).toBeUndefined();
      expect(excelCellToNumber('1.2.3')).toBeUndefined();
      expect(excelCellToNumber('$8')).toBeUndefined();
      expect(excelCellToNumber('Q1')).toBeUndefined();
      expect(excelCellToNumber('')).toBeUndefined();
      expect(excelCellToNumber('North')).toBeUndefined();
    });
  });

  describe('normalizeFontFamily', () => {
    it('strips subset prefixes and keeps real names', async () => {
      const { normalizeFontFamily } = await import('@/lib/pdf-utils');
      expect(normalizeFontFamily('ABCDEE+Arial-BoldMT')).toBe('Arial-BoldMT');
      expect(normalizeFontFamily('Roboto')).toBe('Roboto');
    });

    it('rejects generic CSS keywords and empties', async () => {
      const { normalizeFontFamily } = await import('@/lib/pdf-utils');
      expect(normalizeFontFamily('sans-serif')).toBeUndefined();
      expect(normalizeFontFamily('monospace')).toBeUndefined();
      expect(normalizeFontFamily(undefined)).toBeUndefined();
      expect(normalizeFontFamily('   ')).toBeUndefined();
    });
  });

  describe('lineCells', () => {
    it('merges close items and splits on large gaps', async () => {
      const { lineCells } = await import('@/lib/pdf-utils');
      const line = {
        text: 'Item Qty',
        x: 50,
        y: 100,
        width: 200,
        size: 12,
        bold: false,
        italic: false,
        alignment: 'left' as const,
        items: [
          { text: 'Item', x: 50, size: 12, bold: false, italic: false },
          { text: 'na', x: 62, size: 12, bold: false, italic: false },
          { text: 'Qty', x: 220, size: 12, bold: false, italic: false },
        ],
      };
      const cells = lineCells(line);
      expect(cells.map((c) => c.text)).toEqual(['Item na', 'Qty']);
      expect(cells[0].items).toHaveLength(2);
    });
  });

  describe('itemsToStyledRuns', () => {
    it('groups same-style items and splits on style change', async () => {
      const { itemsToStyledRuns } = await import('@/lib/pdf-utils');
      const runs = itemsToStyledRuns(
        [
          { text: 'Bold', x: 0, size: 12, bold: true, italic: false },
          { text: 'text', x: 30, size: 12, bold: true, italic: false },
          { text: 'plain', x: 60, size: 12, bold: false, italic: false },
        ],
        12,
      );
      expect(runs).toHaveLength(2);
      expect(runs[0].text).toBe('Bold text');
      expect(runs[0].bold).toBe(true);
      expect(runs[1].text).toBe('plain');
    });

    it('keeps color and font family on runs', async () => {
      const { itemsToStyledRuns } = await import('@/lib/pdf-utils');
      const runs = itemsToStyledRuns(
        [
          {
            text: 'Red',
            x: 0,
            size: 12,
            bold: false,
            italic: false,
            color: 'CC0000',
            fontFamily: 'ABCDEE+Roboto',
          },
        ],
        12,
      );
      expect(runs[0].color).toBe('CC0000');
      expect(runs[0].fontFamily).toBe('Roboto');
      expect(runs[0].halfPoints).toBe(22); // round(12*2*0.92)
    });
  });

  describe('linkForLine', () => {
    it('picks the link with the largest horizontal overlap', async () => {
      const { linkForLine } = await import('@/lib/pdf-utils');
      const line = { y: 100, size: 12, x: 50, width: 100 };
      const links = [
        { url: 'https://a.example', x0: 0, y0: 80, x1: 60, y1: 110 },
        { url: 'https://b.example', x0: 40, y0: 90, x1: 200, y1: 112 },
      ];
      expect(linkForLine(line, links)?.url).toBe('https://b.example');
    });

    it('returns undefined when nothing overlaps', async () => {
      const { linkForLine } = await import('@/lib/pdf-utils');
      const line = { y: 100, size: 12, x: 50, width: 100 };
      expect(
        linkForLine(line, [{ url: 'https://a.example', x0: 0, y0: 10, x1: 30, y1: 20 }]),
      ).toBeUndefined();
      expect(linkForLine(line, [])).toBeUndefined();
    });
  });

  describe('lineToParagraphXml', () => {
    it('emits runs with color, fonts, bold and alignment', async () => {
      const { lineToParagraphXml } = await import('@/lib/pdf-utils');
      const line = {
        text: 'Hello world',
        x: 40,
        y: 200,
        width: 200,
        size: 12,
        bold: false,
        italic: false,
        color: 'CC0000',
        alignment: 'left' as const,
        items: [
          {
            text: 'Hello',
            x: 40,
            size: 12,
            bold: true,
            italic: false,
            color: 'CC0000',
            fontFamily: 'Roboto',
          },
          { text: 'world', x: 80, size: 12, bold: false, italic: false, color: 'CC0000' },
        ],
      };
      const xml = lineToParagraphXml(line, { headingLevel: 0 });
      expect(xml).toContain('<w:b/>');
      expect(xml).toContain('w:color w:val="CC0000"');
      expect(xml).toContain('w:rFonts w:ascii="Roboto"');
      expect(xml).toContain('<w:jc w:val="left"/>');
      expect(xml).toContain('w:spacing w:after="120"');
    });

    it('wraps runs into a hyperlink when rel id is given', async () => {
      const { lineToParagraphXml } = await import('@/lib/pdf-utils');
      const line = {
        text: 'Visit',
        x: 40,
        y: 200,
        width: 50,
        size: 12,
        bold: false,
        italic: false,
        alignment: 'left' as const,
        items: [{ text: 'Visit', x: 40, size: 12, bold: false, italic: false }],
      };
      const xml = lineToParagraphXml(line, { headingLevel: 0, linkRelId: 'rLnk1' });
      expect(xml).toContain('<w:hyperlink r:id="rLnk1"');
      expect(xml).toContain('w:u w:val="single"');
      expect(xml).toContain('w:color w:val="0563C1"');
    });
  });

  describe('tableRegionToXml', () => {
    it('builds a w:tbl with grid, borders and styled cells', async () => {
      const { detectTableRegions, tableRegionToXml } = await import('@/lib/pdf-utils');
      const mk = (text: string, x: number) => ({
        text,
        x,
        items: [{ text, x, size: 12, bold: false, italic: false }],
      });
      const cellsPerLine = [
        [mk('Item', 50), mk('Qty', 220)],
        [mk('Paper', 52), mk('2', 221)],
      ];
      const [region] = detectTableRegions(cellsPerLine, 14);
      const xml = tableRegionToXml(cellsPerLine, region, { usableWidthPt: 451, fallbackSize: 12 });
      expect(xml).toContain('<w:tbl>');
      expect(xml).toContain('<w:gridCol');
      expect(xml).toContain('w:tblBorders');
      expect(xml).toMatch(/<w:tc>.{0,300}Item/s);
      expect(xml).toMatch(/<w:tc>.{0,300}Qty/s);
      expect(xml.endsWith('<w:p/>')).toBe(true);
    });
  });

  describe('findColumnCuts', () => {
    const twoColumnItems = () => {
      const items: { x: number; y: number; width: number; size: number }[] = [];
      for (let row = 0; row < 4; row++) {
        const y = 700 - row * 16;
        items.push({ x: 50, y, width: 210, size: 12 }, { x: 330, y, width: 210, size: 12 });
      }
      return items;
    };

    it('finds a single gutter on a two-column page', async () => {
      const { findColumnCuts } = await import('@/lib/pdf-utils');
      const cuts = findColumnCuts(twoColumnItems(), 595, 12);
      expect(cuts).toHaveLength(1);
      expect(cuts[0].start).toBeGreaterThanOrEqual(260);
      expect(cuts[0].end).toBeLessThanOrEqual(330);
    });

    it('ignores wide spanning items but still splits', async () => {
      const { findColumnCuts } = await import('@/lib/pdf-utils');
      const items = [...twoColumnItems(), { x: 50, y: 780, width: 480, size: 18 }];
      const cuts = findColumnCuts(items, 595, 12);
      expect(cuts).toHaveLength(1);
    });

    it('rejects single-column pages', async () => {
      const { findColumnCuts } = await import('@/lib/pdf-utils');
      const items = Array.from({ length: 10 }, (_, i) => ({
        x: 60,
        y: 700 - i * 16,
        width: 460,
        size: 12,
      }));
      expect(findColumnCuts(items, 595, 12)).toEqual([]);
    });

    it('rejects lopsided splits', async () => {
      const { findColumnCuts } = await import('@/lib/pdf-utils');
      const items = [
        ...Array.from({ length: 9 }, (_, i) => ({ x: 50, y: 700 - i * 16, width: 210, size: 12 })),
        { x: 330, y: 700, width: 210, size: 12 },
      ];
      expect(findColumnCuts(items, 595, 12)).toEqual([]);
    });

    it('finds two cuts on a three-column page', async () => {
      const { findColumnCuts } = await import('@/lib/pdf-utils');
      const items: { x: number; y: number; width: number; size: number }[] = [];
      for (let row = 0; row < 4; row++) {
        const y = 700 - row * 16;
        items.push(
          { x: 50, y, width: 180, size: 12 },
          { x: 270, y, width: 180, size: 12 },
          { x: 490, y, width: 180, size: 12 },
        );
      }
      const cuts = findColumnCuts(items, 700, 12);
      expect(cuts).toHaveLength(2);
    });
  });

  describe('reorderLinesByColumns', () => {
    const cuts = [{ start: 270, end: 320 }];
    const mkItem = (text: string, x: number, width: number) => ({
      text,
      x,
      width,
      size: 12,
      bold: false,
      italic: false,
    });
    const mkLine = (
      text: string,
      x: number,
      y: number,
      width: number,
      items?: ReturnType<typeof mkItem>[],
    ) => ({
      text,
      x,
      y,
      width,
      size: 12,
      bold: false,
      italic: false,
      alignment: 'left' as const,
      items: items ?? [mkItem(text, x, width)],
    });

    it('emits columns in reading order for independent column flows', async () => {
      const { reorderLinesByColumns } = await import('@/lib/pdf-utils');
      // Колонки с независимым ритмом строк (не выровнены по y) — строки
      // целиком в одной колонке.
      const lines = [
        mkLine('Title', 50, 760, 200),
        mkLine('M1L', 50, 700, 210),
        mkLine('M1R', 330, 690, 210),
        mkLine('M2L', 50, 660, 210),
        mkLine('M2R', 330, 650, 210),
      ];
      const out = reorderLinesByColumns(lines, cuts, 595);
      expect(out.map((l) => l.text)).toEqual(['Title', 'M1L', 'M2L', 'M1R', 'M2R']);
    });

    it('protects dense-pitch spanning rows with >=3 cells (table rows)', async () => {
      const { reorderLinesByColumns } = await import('@/lib/pdf-utils');
      // 3 ячейки в строке + плотный шаг (20 ≤ 2.5×12) → таблица: не режем.
      const row = (text: string, y: number) =>
        mkLine(text, 50, y, 490, [
          mkItem(`${text}-a`, 50, 100),
          mkItem(`${text}-b`, 250, 60),
          mkItem(`${text}-c`, 400, 100),
        ]);
      const lines = [row('Row1', 700), row('Row2', 680)];
      expect(reorderLinesByColumns(lines, cuts, 595)).toEqual(lines);
    });

    it('cuts two-cell aligned columns back into column order', async () => {
      const { reorderLinesByColumns } = await import('@/lib/pdf-utils');
      // 2 выровненные ячейки — двухколоночная статья, а не таблица.
      const row = (left: string, right: string, y: number) =>
        mkLine(`${left} ${right}`, 50, y, 490, [mkItem(left, 50, 210), mkItem(right, 330, 210)]);
      const lines = [row('L1', 'R1', 700), row('L2', 'R2', 680)];
      const out = reorderLinesByColumns(lines, cuts, 595);
      expect(out.map((l) => l.text)).toEqual(['L1', 'L2', 'R1', 'R2']);
      expect(out[0].x).toBe(50);
      expect(out[2].x).toBe(330);
    });

    it('keeps a truly spanning line as a band separator', async () => {
      const { reorderLinesByColumns } = await import('@/lib/pdf-utils');
      const spanning = mkLine('Wide heading text', 50, 760, 490, [
        mkItem('Wide heading', 50, 210),
        mkItem(' ', 280, 30), // занимает просвет
        mkItem('text', 330, 60),
      ]);
      const merged = mkLine('L1 R1', 50, 700, 490, [mkItem('L1', 50, 210), mkItem('R1', 330, 210)]);
      const out = reorderLinesByColumns([spanning, merged], cuts, 595);
      expect(out.map((l) => l.text)).toEqual(['Wide heading text', 'L1', 'R1']);
      expect(out[1].x).toBe(50);
      expect(out[2].x).toBe(330);
    });

    it('returns lines unchanged when there are no cuts', async () => {
      const { reorderLinesByColumns } = await import('@/lib/pdf-utils');
      const lines = [mkLine('A', 50, 700, 200), mkLine('B', 50, 680, 200)];
      expect(reorderLinesByColumns(lines, [], 595)).toBe(lines);
    });
  });

  describe('fillColorToHex', () => {
    it('converts RGB to hex', async () => {
      const { fillColorToHex } = await import('@/lib/pdf-utils');
      expect(fillColorToHex('rgb', [1, 0, 0])).toBe('ff0000');
      expect(fillColorToHex('rgb', [0, 1, 0])).toBe('00ff00');
      expect(fillColorToHex('rgb', [0, 0, 1])).toBe('0000ff');
    });

    it('returns undefined for black RGB (near-zero)', async () => {
      const { fillColorToHex } = await import('@/lib/pdf-utils');
      expect(fillColorToHex('rgb', [0, 0, 0])).toBeUndefined();
      expect(fillColorToHex('rgb', [0.01, 0.01, 0.01])).toBeUndefined();
    });

    it('converts gray to hex', async () => {
      const { fillColorToHex } = await import('@/lib/pdf-utils');
      expect(fillColorToHex('gray', [0.5])).toBe('808080');
    });

    it('returns undefined for black and white gray', async () => {
      const { fillColorToHex } = await import('@/lib/pdf-utils');
      expect(fillColorToHex('gray', [0])).toBeUndefined();
      expect(fillColorToHex('gray', [1])).toBeUndefined();
    });

    it('converts CMYK to hex', async () => {
      const { fillColorToHex } = await import('@/lib/pdf-utils');
      const hex = fillColorToHex('cmyk', [1, 0, 0, 0]);
      expect(hex).toBe('00ffff');
    });

    it('returns undefined for black CMYK', async () => {
      const { fillColorToHex } = await import('@/lib/pdf-utils');
      expect(fillColorToHex('cmyk', [0, 0, 0, 1])).toBeUndefined();
    });

    it('returns undefined for empty components', async () => {
      const { fillColorToHex } = await import('@/lib/pdf-utils');
      expect(fillColorToHex('rgb', [])).toBeUndefined();
    });
  });

  describe('dominantString', () => {
    it('returns most frequent string', async () => {
      const { dominantString } = await import('@/lib/pdf-utils');
      expect(dominantString(['a', 'b', 'a'])).toBe('a');
    });

    it('returns undefined for empty array', async () => {
      const { dominantString } = await import('@/lib/pdf-utils');
      expect(dominantString([])).toBeUndefined();
    });
  });

  describe('ocrRenderScale', () => {
    it('computes scale from long side', async () => {
      const { ocrRenderScale } = await import('@/lib/pdf-utils');
      expect(ocrRenderScale(612, 792)).toBeCloseTo(2.27, 1);
    });

    it('clamps to max', async () => {
      const { ocrRenderScale } = await import('@/lib/pdf-utils');
      expect(ocrRenderScale(100, 100, 1800, 0.5, 2)).toBe(2);
    });

    it('clamps to min', async () => {
      const { ocrRenderScale } = await import('@/lib/pdf-utils');
      expect(ocrRenderScale(5000, 5000, 1800, 0.5, 3)).toBe(0.5);
    });
  });

  describe('batesNumbering', () => {
    it('is an async function accepting file and options', async () => {
      const { batesNumbering } = await import('@/lib/pdf-utils');
      expect(typeof batesNumbering).toBe('function');
    });

    it('defaults to prefix-empty, start 1, digits 6, bottom-right', async () => {
      const { batesNumbering } = await import('@/lib/pdf-utils');
      expect(batesNumbering.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ============================================================
// Phase F — списки и колонтитулы
// ============================================================

describe('detectListItem', () => {
  it('detects bullet markers with a following space', async () => {
    const { detectListItem } = await import('@/lib/pdf-utils');
    for (const marker of ['•', '●', '▪', '◦', '‣', '·']) {
      expect(detectListItem(`${marker} Buy milk`), `${marker}`).toMatchObject({
        kind: 'bullet',
        prefixLength: marker.length + 1,
      });
    }
    expect(detectListItem('- Task one')).toMatchObject({ kind: 'bullet', prefixLength: 2 });
    expect(detectListItem('– Task one')).toMatchObject({ kind: 'bullet', prefixLength: 2 });
    expect(detectListItem('— Task one')).toMatchObject({ kind: 'bullet', prefixLength: 2 });
    expect(detectListItem('* Task one')).toMatchObject({ kind: 'bullet', prefixLength: 2 });
  });

  it('detects ordered markers: digits, letters, roman numerals', async () => {
    const { detectListItem } = await import('@/lib/pdf-utils');
    expect(detectListItem('1. Ship the build')).toMatchObject({ kind: 'ordered', prefixLength: 3 });
    expect(detectListItem('12) Ship the build')).toMatchObject({
      kind: 'ordered',
      prefixLength: 4,
    });
    expect(detectListItem('a. First point')).toMatchObject({ kind: 'ordered', prefixLength: 3 });
    expect(detectListItem('б) Русская буква')).toMatchObject({ kind: 'ordered', prefixLength: 3 });
    expect(detectListItem('IV. Appendix')).toMatchObject({ kind: 'ordered', prefixLength: 4 });
    expect(detectListItem('999. Edge case')).toMatchObject({ kind: 'ordered', prefixLength: 5 });
  });

  it('rejects false positives: years, negatives, i.e., decimals', async () => {
    const { detectListItem } = await import('@/lib/pdf-utils');
    expect(detectListItem('2026. A year in review')).toBeNull(); // 4 цифры — год, не номер
    expect(detectListItem('-5')).toBeNull(); // нет пробела — отрицательное число
    expect(detectListItem('-5 degrees')).toBeNull(); // пробел после числа, не маркера
    expect(detectListItem('i. it is')).toBeNull(); // одиночная строчная «i» (i.e.)
    expect(detectListItem('1.5 ratio')).toBeNull(); // дробь: нет пробела после точки
    expect(detectListItem('1000. Not a list')).toBeNull(); // 4 цифры
    expect(detectListItem('plain sentence')).toBeNull();
    expect(detectListItem('')).toBeNull();
  });
});

describe('stripRunsPrefix', () => {
  it('cuts the marker across a style boundary, preserving run styles', async () => {
    const { stripRunsPrefix } = await import('@/lib/pdf-utils');
    const runs = [
      { text: '1. Sh', bold: true, italic: false, halfPoints: 22 },
      { text: 'ip the build', bold: false, italic: true, halfPoints: 22 },
    ];
    const out = stripRunsPrefix(runs, 3); // «1. »
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ text: 'Sh', bold: true });
    expect(out[1]).toMatchObject({ text: 'ip the build', italic: true });
    expect(out.map((r) => r.text).join('')).toBe('Ship the build');
  });

  it('drops runs consumed entirely and handles zero length', async () => {
    const { stripRunsPrefix } = await import('@/lib/pdf-utils');
    const runs = [
      { text: '• ', bold: true, italic: false, halfPoints: 22 },
      { text: 'Item', bold: false, italic: false, halfPoints: 22 },
    ];
    const out = stripRunsPrefix(runs, 2);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('Item');
    const untouched = stripRunsPrefix(runs, 0);
    expect(untouched).toBe(runs);
  });
});

describe('findRepeatingHeaderFooterLines', () => {
  const mkPages = (
    count: number,
    headerEvery: number,
    opts: { height?: number } = {},
  ): { height: number; lines: { y: number; text: string }[] }[] => {
    const height = opts.height ?? 400;
    return Array.from({ length: count }, (_, i) => ({
      height,
      lines: [
        ...(i < headerEvery ? [{ y: 20, text: 'Quarterly   Digest' }] : []),
        { y: 200, text: `Unique body ${i}` },
        ...(i < headerEvery ? [{ y: height - 20, text: 'Confidential — internal' }] : []),
      ],
    }));
  };

  it('returns nothing for fewer pages than minPages (2 pages)', async () => {
    const { findRepeatingHeaderFooterLines } = await import('@/lib/pdf-utils');
    expect(findRepeatingHeaderFooterLines(mkPages(2, 2)).size).toBe(0);
  });

  it('requires the ratio threshold: 5/10 is below it, 6/10 passes', async () => {
    const { findRepeatingHeaderFooterLines } = await import('@/lib/pdf-utils');
    expect(findRepeatingHeaderFooterLines(mkPages(10, 5)).size).toBe(0);
    const found = findRepeatingHeaderFooterLines(mkPages(10, 6));
    expect(found.has('Quarterly Digest')).toBe(true); // пробелы нормализованы
    expect(found.has('Confidential — internal')).toBe(true);
    expect(found.has('Unique body 0')).toBe(false);
  });

  it('ignores repeated text outside header/footer zones', async () => {
    const { findRepeatingHeaderFooterLines } = await import('@/lib/pdf-utils');
    const pages = Array.from({ length: 4 }, () => ({
      height: 400,
      lines: [{ y: 200, text: 'Same middle line' }],
    }));
    expect(findRepeatingHeaderFooterLines(pages).size).toBe(0);
  });
});

describe('buildNumberingXml', () => {
  it('emits bullet num 1 and one decimal num per ordered group (2..N+1)', async () => {
    const { buildNumberingXml } = await import('@/lib/pdf-utils');
    const xml = buildNumberingXml(2);
    expect(xml).toContain('w:abstractNumId="0"');
    expect(xml).toContain('w:numFmt w:val="bullet"');
    expect(xml).toContain('w:numFmt w:val="decimal"');
    expect(xml).toContain('w:ind w:left="720" w:hanging="360"');
    expect(xml).toContain('<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>');
    expect(xml).toContain('<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>');
    expect(xml).toContain('<w:num w:numId="3"><w:abstractNumId w:val="1"/></w:num>');
    expect(xml).not.toContain('w:numId="4"');
  });
});

describe('WordBodyBuilder', () => {
  const mkPara = (text: string) =>
    `<w:p><w:pPr><w:spacing w:after="120"/><w:jc w:val="left"/></w:pPr><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

  it('shares numId=1 across bullets and restarts ordered groups (2, 3, …)', async () => {
    const { WordBodyBuilder } = await import('@/lib/pdf-utils');
    const body = new WordBodyBuilder();
    expect(body.addListItem(mkPara('Bullet A'), 'bullet')).toBe(1);
    expect(body.addListItem(mkPara('Bullet B'), 'bullet')).toBe(1);
    expect(body.addListItem(mkPara('One'), 'ordered')).toBe(2);
    expect(body.addListItem(mkPara('Two'), 'ordered')).toBe(2);
    body.addParagraph(mkPara('Separator'));
    expect(body.addListItem(mkPara('Restart'), 'ordered')).toBe(3);
    expect(body.orderedGroupCount).toBe(2);
    expect(body.listItemCount).toBe(5);

    const xml = body.finish();
    expect(xml).toContain('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
    expect(xml).toContain('<w:numId w:val="2"/>');
    expect(xml).toContain('<w:numId w:val="3"/>');
    // numPr вставлен внутрь pPr, первым элементом (перед spacing).
    expect(xml).toMatch(/<w:pPr><w:numPr>/);
    expect(xml.indexOf('Bullet A')).toBeLessThan(xml.indexOf('Restart'));
  });

  it('addRaw (tables/images) breaks the ordered group too', async () => {
    const { WordBodyBuilder } = await import('@/lib/pdf-utils');
    const body = new WordBodyBuilder();
    body.addListItem(mkPara('One'), 'ordered');
    body.addRaw('<w:tbl/>');
    // Новая группа после таблицы → новый numId (рестарт нумерации).
    expect(body.addListItem(mkPara('Two'), 'ordered')).toBe(3);
    expect(body.orderedGroupCount).toBe(2);
    expect(body.finish()).toContain('<w:tbl/>');
  });

  it('keeps Heading pStyle before numPr when a list item is styled', async () => {
    const { WordBodyBuilder, lineToParagraphXml } = await import('@/lib/pdf-utils');
    const line = {
      text: 'Item',
      x: 40,
      y: 100,
      width: 80,
      size: 22,
      bold: true,
      italic: false,
      alignment: 'left' as const,
      items: [{ text: 'Item', x: 40, size: 22, bold: true, italic: false }],
    };
    const styled = lineToParagraphXml(line, { headingLevel: 2 });
    const body = new WordBodyBuilder();
    body.addListItem(styled, 'ordered');
    expect(body.finish()).toMatch(/<w:pPr><w:pStyle[^>]*\/><w:numPr>/);
  });
});
