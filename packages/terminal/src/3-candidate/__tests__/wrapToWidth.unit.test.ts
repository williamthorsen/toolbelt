import { describe, expect, it } from 'vitest';

import { measureWidth } from '../measureWidth.ts';
import { wrapToWidth } from '../wrapToWidth.ts';

const RED = '\u{1B}[31m';
const RESET = '\u{1B}[39m';

describe(wrapToWidth, () => {
  it('wraps greedily, filling each line before starting the next', () => {
    expect(wrapToWidth('one two three four five', { width: 10 })).toBe('one two\nthree four\nfive');
  });

  it('collapses every run of whitespace, line breaks included', () => {
    expect(wrapToWidth('  one \t\t two \n\n three  ', { width: 40 })).toBe('one two three');
  });

  it('returns nothing for text that is empty or all whitespace', () => {
    expect(wrapToWidth('', { width: 10 })).toBe('');
    expect(wrapToWidth(' \n\t ', { indent: 4, width: 10 })).toBe('');
  });

  describe('indenting', () => {
    it('takes the indent out of the width rather than adding to it', () => {
      const wrapped = wrapToWidth('one two three four five', { indent: 4, width: 14 });

      expect(wrapped).toBe('    one two\n    three four\n    five');
      for (const line of wrapped.split('\n')) {
        expect(measureWidth(line)).toBeLessThanOrEqual(14);
      }
    });

    it('leaves a hanging first line bare but narrows it just the same', () => {
      const wrapped = wrapToWidth('one two three four five', { hanging: true, indent: 4, width: 14 });

      expect(wrapped).toBe('one two\n    three four\n    five');
    });

    it('ignores an indent that repeat would reject', () => {
      expect(wrapToWidth('one two', { indent: -5, width: 10 })).toBe('one two');
      expect(wrapToWidth('one two', { indent: Infinity, width: 10 })).toBe('one two');
    });
  });

  describe('widths that no line can honour', () => {
    it('keeps a word wider than the content width whole on its own line', () => {
      expect(wrapToWidth('a supercalifragilistic word', { width: 10 })).toBe('a\nsupercalifragilistic\nword');
    });

    // `wrap-ansi` returns a `NaN` width unwrapped, so without the guard this would be one long line.
    it.each([0, -8, NaN, -Infinity])('leaves one column for content at a width of %o', (width) => {
      expect(wrapToWidth('one two three', { width })).toBe('one\ntwo\nthree');
    });

    it('wraps nothing at an infinite width, while still applying the indent', () => {
      expect(wrapToWidth('one two three', { indent: 2, width: Infinity })).toBe('  one two three');
    });
  });

  describe('text that measures wider than its length', () => {
    it('holds every line inside the width across a sweep of widths', () => {
      const text = 'the 漢字 and the ✅ and the 👨‍👩‍👧‍👦 sit in a row of words';

      for (let width = 12; width <= 40; width += 1) {
        const lines = wrapToWidth(text, { width }).split('\n');

        for (const line of lines) {
          expect(measureWidth(line)).toBeLessThanOrEqual(width);
        }
      }
    });

    it('splits no grapheme cluster', () => {
      const wrapped = wrapToWidth('aaaa 👨‍👩‍👧‍👦 bbbb', { width: 6 });

      expect(wrapped).toContain('👨‍👩‍👧‍👦');
    });

    it('closes on every line the style that it opens', () => {
      const wrapped = wrapToWidth(`${RED}red text that wraps here${RESET}`, { width: 10 });
      const lines = wrapped.split('\n');

      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(line.startsWith(RED)).toBe(true);
        expect(line.endsWith(RESET)).toBe(true);
      }
    });

    it('measures a styled line by its visible text alone', () => {
      const wrapped = wrapToWidth(`${RED}one two three four${RESET}`, { width: 8 });

      for (const line of wrapped.split('\n')) {
        expect(measureWidth(line)).toBeLessThanOrEqual(8);
      }
    });
  });
});
