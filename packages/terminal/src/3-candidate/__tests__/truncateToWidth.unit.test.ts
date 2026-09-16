import { describe, expect, it } from 'vitest';

import { measureWidth } from '../measureWidth.ts';
import { truncateToWidth } from '../truncateToWidth.ts';

const RED = '\u{1B}[31m';
const RESET = '\u{1B}[39m';

describe(truncateToWidth, () => {
  it('returns text that already fits, unchanged', () => {
    expect(truncateToWidth('abcdefgh', { width: 8 })).toBe('abcdefgh');
    expect(truncateToWidth('abc', { width: 40 })).toBe('abc');
  });

  it('counts the default ellipsis inside the width', () => {
    expect(truncateToWidth('abcdefgh', { width: 5 })).toBe('abcd…');
  });

  it('takes another ellipsis and counts that one inside the width', () => {
    expect(truncateToWidth('abcdefgh', { ellipsis: '...', width: 5 })).toBe('ab...');
  });

  it('counts a two-cell ellipsis by its cells rather than its length', () => {
    const truncated = truncateToWidth('abcdefgh', { ellipsis: '漢', width: 4 });

    expect(truncated).toBe('ab漢');
    expect(measureWidth(truncated)).toBe(4);
  });

  describe('an ellipsis that does not fit', () => {
    // Left to `cli-truncate`, each of these renders a three-cell `...` into a width that cannot hold it.
    it.each([1, 2])('fills a width of %i with text and no ellipsis', (width) => {
      const truncated = truncateToWidth('abcdefgh', { ellipsis: '...', width });

      expect(truncated).toBe('abcdefgh'.slice(0, width));
      expect(measureWidth(truncated)).toBe(width);
    });

    it('keeps the ellipsis at the width that exactly holds it', () => {
      expect(truncateToWidth('abcdefgh', { ellipsis: '...', width: 3 })).toBe('...');
    });

    it('leaves the width empty rather than splitting the cluster that will not fit in it', () => {
      expect(truncateToWidth('漢字', { ellipsis: '...', width: 1 })).toBe('');
      expect(truncateToWidth('漢字', { ellipsis: '...', width: 2 })).toBe('漢');
    });
  });

  describe('widths that name no room', () => {
    it.each([0, -8, NaN, -Infinity, 0.5])('returns nothing at a width of %o', (width) => {
      expect(truncateToWidth('abcdefgh', { width })).toBe('');
    });

    it('returns the text unchanged at an infinite width', () => {
      expect(truncateToWidth('abcdefgh', { width: Infinity })).toBe('abcdefgh');
    });

    it('reads a fractional width as the whole columns below it', () => {
      expect(truncateToWidth('abcdefgh', { width: 5.9 })).toBe('abcd…');
    });
  });

  describe('text that measures wider than its length', () => {
    it.each([
      ['漢字漢字漢字', 'wide'],
      ['⚠️⚠️⚠️⚠️', 'variation-selector'],
      ['👨‍👩‍👧‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👦', 'zero-width-joined'],
      [`${RED}red text here${RESET}`, 'styled'],
    ])('holds %s input inside the width across a sweep of widths', (text) => {
      for (let width = 1; width <= 16; width += 1) {
        expect(measureWidth(truncateToWidth(text, { width }))).toBeLessThanOrEqual(width);
      }
    });

    it('splits no grapheme cluster, leaving a cell empty rather than half a character', () => {
      // The family emoji measures two cells, so it cannot share a width of two with the one-cell ellipsis.
      expect(truncateToWidth('👨‍👩‍👧‍👦👨‍👩‍👧‍👦', { width: 2 })).toBe('…');
      expect(truncateToWidth('👨‍👩‍👧‍👦👨‍👩‍👧‍👦', { width: 3 })).toBe('👨‍👩‍👧‍👦…');
    });

    it('closes the style that it opens', () => {
      const truncated = truncateToWidth(`${RED}red text here${RESET}`, { width: 8 });

      expect(truncated.startsWith(RED)).toBe(true);
      expect(truncated.endsWith(RESET)).toBe(true);
      expect(measureWidth(truncated)).toBe(8);
    });
  });
});
