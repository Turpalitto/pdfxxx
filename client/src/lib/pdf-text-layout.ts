// ============================================================
// Text/layout helpers — чистые функции без I/O
// ============================================================
//
// Вынесены из pdf-utils.ts (декомпозиция 2026-10-02). Это самый
// безопасный для выноса участок: здесь нет ни pdf-lib, ни pdfjs,
// ни canvas — только арифметика над строками текста и координатами,
// поэтому модуль тривиально тестируется и не тянет зависимости.
//
// pdf-utils.ts реэкспортирует всё отсюда, поэтому публичный API
// и существующие импорты не меняются.

/** Тип элемента строки, нужный для склейки ячеек. */
export interface PdfLayoutItemLike {
  text: string;
  x: number;
  width: number;
  size?: number;
  bold?: boolean;
  italic?: boolean;
}

/** Регион таблицы, найденный по выравниванию ячеек. */
export interface TableRegion {
  start: number;
  end: number;
  columns: number[];
}

// ============================================================
// Pure text/layout helpers (спецификация: pdf-utils.test.ts)
// ============================================================

export function detectFontStyle(fontName?: string): { bold: boolean; italic: boolean } {
  if (!fontName) return { bold: false, italic: false };
  const bold = /bold|black|heavy/i.test(fontName);
  const italic = /italic|oblique/i.test(fontName);
  return { bold, italic };
}

/** x — начало строки, endX — конец, pageWidth — ширина страницы. */
export function lineAlignment(
  x: number,
  endX: number,
  pageWidth: number,
): 'left' | 'center' | 'right' {
  if (!pageWidth) return 'left';
  const leftMargin = x;
  const rightMargin = pageWidth - endX;
  const tolerance = Math.max(6, pageWidth * 0.02);
  if (Math.abs(leftMargin - rightMargin) <= tolerance) return 'center';
  return leftMargin < rightMargin ? 'left' : 'right';
}

export function clusterColumns(xs: number[], tolerance: number): number[] {
  if (xs.length === 0) return [];
  const sorted = [...xs].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const cluster = clusters[clusters.length - 1];
    if (sorted[i] - cluster[cluster.length - 1] <= tolerance) {
      cluster.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }

  return clusters.map((group) => group.reduce((s, v) => s + v, 0) / group.length);
}

export function assignToColumn(x: number, columns: number[]): number {
  if (columns.length === 0) return 0;
  let best = 0;
  let bestDist = Math.abs(x - columns[0]);
  for (let i = 1; i < columns.length; i++) {
    const dist = Math.abs(x - columns[i]);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

export function detectTableRegions(
  cellsPerLine: { x: number }[][],
  lineHeight: number,
): TableRegion[] {
  const regions: TableRegion[] = [];
  const columnTolerance = Math.max(8, lineHeight * 1.2);
  let runStart = -1;

  const flushRun = (endExclusive: number) => {
    if (runStart === -1 || endExclusive - runStart < 2) {
      runStart = -1;
      return;
    }
    const xs: number[] = [];
    for (let i = runStart; i < endExclusive; i++) {
      cellsPerLine[i].forEach((cell) => xs.push(cell.x));
    }
    regions.push({
      start: runStart,
      end: endExclusive - 1,
      columns: clusterColumns(xs, columnTolerance),
    });
    runStart = -1;
  };

  cellsPerLine.forEach((cells, index) => {
    const isTabular = cells.length >= 2;
    if (isTabular && runStart === -1) runStart = index;
    if (!isTabular) flushRun(index);
  });
  flushRun(cellsPerLine.length);

  return regions;
}

export function buildExcelRowsFromLineCells(
  cellsPerLine: { text: string; x: number }[][],
  lineHeight: number,
): string[][] {
  const rows: string[][] = [];
  const regions = detectTableRegions(cellsPerLine, lineHeight);
  const regionByStart = new Map(regions.map((r) => [r.start, r]));

  let i = 0;
  while (i < cellsPerLine.length) {
    const region = regionByStart.get(i);

    if (region) {
      for (let lineIdx = region.start; lineIdx <= region.end; lineIdx++) {
        const row = new Array<string>(region.columns.length).fill('');
        const sortedCells = [...cellsPerLine[lineIdx]].sort((a, b) => a.x - b.x);
        for (const cell of sortedCells) {
          const col = assignToColumn(cell.x, region.columns);
          row[col] = row[col] ? `${row[col]} ${cell.text}` : cell.text;
        }
        rows.push(row);
      }
      i = region.end + 1;
      continue;
    }

    const joined = cellsPerLine[i]
      .map((cell) => cell.text)
      .join(' ')
      .trim();
    rows.push([joined]);
    i += 1;
  }

  return rows;
}

export function mergeLineItemsIntoCells(
  items: Pick<PdfLayoutItemLike, 'text' | 'x' | 'width'>[],
  lineSize: number,
): { text: string; x: number }[] {
  const merged: { text: string; x: number; width: number }[] = [];
  const sortedItems = [...items].sort((a, b) => a.x - b.x);
  const gapThreshold = Math.max(2, lineSize * 0.6);

  for (const item of sortedItems) {
    const prev = merged[merged.length - 1];
    const gap = prev ? item.x - (prev.x + prev.width) : Number.POSITIVE_INFINITY;
    if (prev && gap <= gapThreshold) {
      prev.text = `${prev.text} ${item.text}`.replace(/\s+/g, ' ').trim();
      prev.width = Math.max(prev.width, item.x + item.width - prev.x);
    } else {
      merged.push({ text: item.text.trim(), x: item.x, width: Math.max(0, item.width) });
    }
  }

  return merged.filter((cell) => cell.text).map(({ text, x }) => ({ text, x }));
}

export function fillColorToHex(
  colorSpace: 'rgb' | 'gray' | 'cmyk',
  components: number[],
): string | undefined {
  if (!components || components.length === 0) return undefined;

  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value * 255)))
      .toString(16)
      .padStart(2, '0');

  if (colorSpace === 'rgb' && components.length >= 3) {
    const [r, g, b] = components;
    if (r <= 0.05 && g <= 0.05 && b <= 0.05) return undefined;
    return `${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  if (colorSpace === 'gray' && components.length >= 1) {
    const v = components[0];
    if (v <= 0.05 || v >= 0.95) return undefined;
    return `${toHex(v)}${toHex(v)}${toHex(v)}`;
  }

  if (colorSpace === 'cmyk' && components.length >= 4) {
    const [c, m, y, k] = components;
    if (k >= 0.95) return undefined;
    const r = (1 - c) * (1 - k);
    const g = (1 - m) * (1 - k);
    const b = (1 - y) * (1 - k);
    if (r <= 0.05 && g <= 0.05 && b <= 0.05) return undefined;
    return `${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return undefined;
}

export function dominantString(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  let best: string | undefined;
  let bestCount = 0;

  for (const value of values) {
    const next = (counts.get(value) ?? 0) + 1;
    counts.set(value, next);
    if (next > bestCount) {
      best = value;
      bestCount = next;
    }
  }

  return best;
}

export function ocrRenderScale(
  widthPt: number,
  heightPt: number,
  targetLongSide = 1800,
  minScale = 0.5,
  maxScale = 3,
): number {
  const longSide = Math.max(widthPt, heightPt, 1);
  const raw = targetLongSide / longSide;
  return Math.min(maxScale, Math.max(minScale, raw));
}
