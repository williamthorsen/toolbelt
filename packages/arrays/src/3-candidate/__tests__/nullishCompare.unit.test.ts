import { describe, expect, it } from 'vitest';

import { createNullishComparer, nullishCompare } from '../nullishCompare.ts';

describe(createNullishComparer, () => {
  // Original comparison function
  function compare(a: number, b: number): number {
    return a - b;
  }

  describe('nullishGreater=false (the default)', () => {
    it('returns negative value if a < b', () => {
      const nullishCompare = createNullishComparer(compare);

      expect(nullishCompare(-1, 1)).toBeLessThan(0);
    });

    it('returns positive value if a > b', () => {
      const nullishCompare = createNullishComparer(compare);

      expect(nullishCompare(1, -1)).toBeGreaterThan(0);
    });

    it('lesser values are ranked higher than greater values when sorted', () => {
      const values = [2, 1, 4, 3];
      const expectedValues = [1, 2, 3, 4];

      const nullishCompare = createNullishComparer(compare);
      const actualValues = [...values].sort(nullishCompare);

      expect(actualValues).toStrictEqual(expectedValues);
    });
  });

  describe('nullishGreater option', () => {
    it('if nullishGreater=true, nullish values are ranked lower than other values when sorted', () => {
      const options = { nullishGreater: true };
      const values = [1, -1, null, 2];
      const expectedValues = [-1, 1, 2, null];

      const nullishCompare = createNullishComparer(compare, options);
      const actualValues = [...values].sort(nullishCompare);

      expect(actualValues).toStrictEqual(expectedValues);
    });
  });
});

describe(nullishCompare, () => {
  function compare(a: number, b: number): number {
    return a - b;
  }

  describe('nullishGreater=false (the default)', () => {
    it('if the values are equal, returns 0', () => {
      const a = 1;
      const b = 1;
      const expected = 0;

      const actual = nullishCompare(compare, a, b);

      expect(actual).toBe(expected);
    });

    it('if the values are both nullish, returns 0', () => {
      const a = null;
      const b = null;
      const expected = 0;

      const actual = nullishCompare(compare, a, b);

      expect(actual).toBe(expected);
    });

    it('if a < b, returns a negative number', () => {
      const a = 0;
      const b = 1;

      const result = nullishCompare(compare, a, b);

      expect(result).toBeLessThan(0);
    });

    it('if a > b, returns a positive number', () => {
      const a = 1;
      const b = 0;

      const result = nullishCompare(compare, a, b);

      expect(result).toBeGreaterThan(0);
    });

    it.each([null, undefined])('if only a is nullish, returns a negative number', (value) => {
      const a = value;
      const b = 1;

      const result = nullishCompare(compare, a, b);

      expect(result).toBeLessThan(0);
    });

    it.each([null, undefined])('if only b is nullish, returns a positive number', (value) => {
      const a = 1;
      const b = value;

      const result = nullishCompare(compare, a, b);

      expect(result).toBeGreaterThan(0);
    });
  });

  describe('nullishGreater=true', () => {
    function compare(a: { value: number }, b: { value: number }): number {
      return a.value - b.value;
    }

    const options = { nullishGreater: true };

    it('if the values are equal, returns 0', () => {
      const a = { value: 1 };
      const b = { value: 1 };
      const expected = 0;

      const actual = nullishCompare(compare, a, b, options);

      expect(actual).toBe(expected);
    });

    it('if the values are both nullish, returns 0', () => {
      const a = null;
      const b = undefined;
      const expected = 0;

      const actual = nullishCompare(compare, a, b, options);

      expect(actual).toBe(expected);
    });

    it('if a < b, returns a negative number', () => {
      const a = { value: 1 };
      const b = { value: 2 };

      const result = nullishCompare(compare, a, b, options);

      expect(result).toBeLessThan(0);
    });

    it('if a > b, returns a positive number', () => {
      const a = { value: 2 };
      const b = { value: 1 };

      const result = nullishCompare(compare, a, b, options);

      expect(result).toBeGreaterThan(0);
    });

    it.each([null, undefined])(`if only a is %s, returns a positive number`, (nullish) => {
      const a = nullish;
      const b = { value: 0 };

      const result = nullishCompare(compare, a, b, options);

      expect(result).toBeGreaterThan(0);
    });

    it.each([null, undefined])(`if only b is %s, returns a negative number`, (nullish) => {
      const a = { value: 0 };
      const b = nullish;

      const result = nullishCompare(compare, a, b, options);

      expect(result).toBeLessThan(0);
    });
  });
});
