import { describe, expect, it } from 'vitest';

import { reverseComparator } from '../reverseComparator.ts';

describe(reverseComparator, () => {
  function compareNumbers(a: number, b: number): number {
    return a - b;
  }

  function compareStrings(a: string, b: string): number {
    return a.localeCompare(b);
  }

  describe('with a number comparator', () => {
    const compare = reverseComparator(compareNumbers);

    it('reverses the order of comparison', () => {
      const a = 1;
      const b = 2;
      const expected = 1; // b > a, so it should return positive

      const actual = compare(a, b);

      expect(actual).toBe(expected);
    });

    it('returns 0 if the values are equal', () => {
      const a = 1;
      const b = 1;
      const expected = 0;

      const actual = compare(a, b);

      expect(actual).toBe(expected);
    });
  });

  describe('with a string comparator', () => {
    const reversed = reverseComparator(compareStrings);

    it('reverses the order of comparison', () => {
      const a = 'a';
      const b = 'b';
      const expected = 1; // 'b' > 'a', so it should return positive

      const actual = reversed(a, b);

      expect(actual).toBe(expected);
    });

    it('returns 0 if the values are equal', () => {
      const a = 'a';
      const b = 'a';
      const expected = 0;

      const actual = reversed(a, b);

      expect(actual).toBe(expected);
    });
  });
});
