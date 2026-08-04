import { describe, expect, it } from 'vitest';

import { IntegerSeed } from '../IntegerSeed.ts';

describe('IntegerSeed', () => {
  describe('static toInt()', () => {
    it('given an integer within range, returns it', () => {
      const input = 1_234;
      const expected = input;

      const actual = IntegerSeed.toInt(input);

      expect(actual).toBe(expected);
    });

    it('given an integer out of range, returns the number modulo IntegerSeed.max', () => {
      const input = IntegerSeed.max + 1;
      const expected = 1;

      const actual = IntegerSeed.toInt(input);

      expect(actual).toBe(expected);
    });

    it('converts a fractional number to an integer', () => {
      const input = 0.123_4;

      const output = IntegerSeed.toInt(input);

      expect(Number.isSafeInteger(output)).toBe(true);
    });

    it('given an integer beyond safe-integer precision, disperses it instead of taking it modulo max', () => {
      const input = 2 ** 53;

      const output = IntegerSeed.toInt(input);

      expect(output).toBeGreaterThanOrEqual(1);
      expect(output).toBeLessThanOrEqual(IntegerSeed.max);
      expect(output).not.toBe(input % IntegerSeed.max); // 4194304, which barely differs from neighboring seeds
    });

    it('given an input of 0, returns the max integer', () => {
      const input = 0;

      const output = IntegerSeed.toInt(input);

      expect(output).toBe(IntegerSeed.max);
      expect(output).not.toBe(0);
    });
  });
});
