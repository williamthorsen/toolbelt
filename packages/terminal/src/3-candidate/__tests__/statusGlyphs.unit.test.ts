import { describe, expect, it } from 'vitest';

import { measureGlyphColumn } from '../defineGlyphSet.ts';
import { STATUS_GLYPHS } from '../statusGlyphs.ts';

const STATUS_NAMES = ['blocked', 'failed', 'info', 'passed', 'skipped', 'warning'] as const;

describe('STATUS_GLYPHS', () => {
  it('gives every status a glyph in each style', () => {
    expect(Object.keys(STATUS_GLYPHS.plain)).toStrictEqual([...STATUS_NAMES]);
    expect(Object.keys(STATUS_GLYPHS.rich)).toStrictEqual([...STATUS_NAMES]);
  });

  it.each(STATUS_NAMES)('gives %s a plain word that a log can be grepped for', (name) => {
    expect(STATUS_GLYPHS.plain[name].text).toMatch(/^[A-Z]+$/);
  });

  // The widths that a caller derives a gutter from, locked so that a longer plain word cannot widen the column
  // without the change being seen.
  it('measures 5 cells for the plain column and 2 for the rich one', () => {
    expect(measureGlyphColumn(STATUS_GLYPHS.plain)).toBe(5);
    expect(measureGlyphColumn(STATUS_GLYPHS.rich)).toBe(2);
  });
});
