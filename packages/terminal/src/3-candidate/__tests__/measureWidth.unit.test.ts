import { describe, expect, it } from 'vitest';

import { measureWidth } from '../measureWidth.ts';

describe(measureWidth, () => {
  it.each([
    ['hello', 5],
    ['', 0],
  ])('reports the length of ASCII text %o as %i', (text, width) => {
    expect(measureWidth(text)).toBe(width);
  });

  // Each of these measures wider or narrower than its UTF-16 length, which is what the function exists for.
  it.each([
    ['漢字', 4, 2],
    ['⚠️', 2, 2],
    ['✅', 2, 1],
    ['👨‍👩‍👧‍👦', 2, 11],
    ['\u{1B}[31mred\u{1B}[39m', 3, 13],
  ])('reports %o as %i cells although its length is %i', (text, width, length) => {
    expect(text).toHaveLength(length);
    expect(measureWidth(text)).toBe(width);
  });

  it('reads an ambiguous-width character as one cell, the reading that defineGlyphSet refuses to rely on', () => {
    expect(measureWidth('→')).toBe(1);
  });
});
