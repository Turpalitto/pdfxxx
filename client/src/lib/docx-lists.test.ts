import { describe, expect, it } from 'vitest';
import { detectListItem, stripListMarker, formatWordListNumber, type StyledRun } from './pdf-utils';

describe('DOCX list recognition', () => {
  it.each([
    [3, 'upperRoman', 'III'],
    [4, 'upperRoman', 'IV'],
    [49, 'lowerRoman', 'xlix'],
    [3999, 'upperRoman', 'MMMCMXCIX'],
    [0, 'upperRoman', null],
    [4000, 'upperRoman', null],
    [26, 'lowerLetter', 'z'],
    [27, 'lowerLetter', 'aa'],
    [28, 'lowerLetter', 'bb'],
    [52, 'upperLetter', 'ZZ'],
    [53, 'upperLetter', 'AAA'],
    [703, 'upperLetter', 'A'.repeat(28)],
    [0, 'lowerLetter', null],
    [3, 'decimalZero', '03'],
    [0, 'decimal', '0'],
    [3, 'unsupported', null],
  ])('formats %s as %s without silently changing numbering style', (value, format, expected) => {
    expect(formatWordListNumber(value as number, format as string)).toBe(expected);
  });
  it('requires an actual marker and body, keeping ambiguous text unchanged', () => {
    for (const text of [
      '2026. Report',
      '1.5 kg',
      '-5 degrees',
      '001. Code',
      '•',
      '1. ',
      'i.e. prose',
    ]) {
      expect(detectListItem(text), text).toBeNull();
    }
    expect(detectListItem('3) Item')).toMatchObject({ kind: 'ordered', start: 3, suffix: ')' });
    expect(detectListItem('• Item')?.kind).toBe('bullet');
  });

  it('strips a styled marker without losing the first body character or mutating runs', () => {
    const runs: StyledRun[] = [
      { text: '3', bold: true, italic: false, halfPoints: 24 },
      { text: ')', bold: false, italic: true, halfPoints: 24 },
      { text: 'Body', bold: false, italic: false, halfPoints: 24, color: 'ff0000' },
    ];
    expect(stripListMarker(runs, '3)')).toEqual([runs[2]]);
    expect(runs.map((run) => run.text).join('')).toBe('3)Body');
  });
});
