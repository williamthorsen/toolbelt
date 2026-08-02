import { describe, expect, it } from 'vitest';

import { scale, scaleInt } from '../scale.ts';

describe(scale, () => {
  it('scales a number from default range [0, 1] to range [0, 100]', () => {
    const result = scale(0.5, { min: 0, max: 100 });
    expect(result).toBe(50);
  });

  it('scales a number from range [0, 10] to range [0, 100]', () => {
    const result = scale(5, { min: 0, max: 100 }, { min: 0, max: 10 });
    expect(result).toBe(50);
  });

  it('scales a number from range [-10, 10] to range [0, 1]', () => {
    const result = scale(0, { min: 0, max: 1 }, { min: -10, max: 10 });
    expect(result).toBe(0.5);
  });

  it('scales a number from range [0, 1] to range [-10, 10]', () => {
    const result = scale(0.5, { min: -10, max: 10 });
    expect(result).toBe(0);
  });

  it('works with negative range', () => {
    const result = scale(0.5, { min: -10, max: 0 }, { min: 0, max: 1 });
    expect(result).toBe(-5);
  });

  it('works with negative values', () => {
    const result = scale(-5, { min: 0, max: 100 }, { min: -10, max: 10 });
    expect(result).toBe(25);
  });

  it('scales a value outside the fromRange to a value outside the toRange', () => {
    const result = scale(15, { min: 0, max: 100 }, { min: 0, max: 10 });
    expect(result).toBe(150);
  });
});

describe('scaleInt()', () => {
  it('scales the input and always returns an integer', () => {
    const expected = 50;

    const actual = scaleInt(0.501, { min: 0, max: 100 });

    expect(actual).toBe(expected);
  });

  const testCases = [
    { min: 0.5, max: 100 },
    { min: 0, max: 100.5 },
    { min: 0, max: 2 ** 53 + 2 }, // an integer, but beyond safe-integer precision
  ] as const;

  it.each(testCases)(
    'if any range value is given but not a safe integer (range: [$min, $max]), throws an error',
    (range) => {
      const throwingFn = () => scaleInt(0.5, range);

      expect(throwingFn).toThrow(new RangeError('Invalid range: min and max must be safe integers.'));
    },
  );
});
