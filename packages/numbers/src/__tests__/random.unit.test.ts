import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { random } from '../random.ts';

describe('random()', () => {
  it('given the same seed, returns the same output', () => {
    const seed = 1234;
    const random1 = random({ seed });
    const random2 = random({ seed });

    expect(random1).toBe(0.067_474_613_463_261_45);
    expect(random2).toBe(random1);
  });

  it('accepts a function as a seed', () => {
    const seed = 1234;
    const seedFn = () => 1234;

    const random1 = random({ seed });
    const random2 = random({ seed: seedFn });

    expect(random2).toBe(random1);
  });

  // These values are copied from trial runs of the original Deno code to ensure that the behavior is preserved.
  it.each([
    { seed: 0.387_782_332_202_318_3, max: 9_007_199_254_740_991, expected: 2_928_838_066_884_486 },
    { seed: 1234, expected: 0.067_474_613_463_261_45 },
  ])('returns expected value $expected for seed $seed', ({ seed, max, expected }) => {
    const actual = random({ seed, max });

    expect(actual).toBe(expected);
  });
});

describe('random() with mocked Math.random', () => {
  // Backup of the original Math.random
  const originalRandom = Math.random;

  beforeEach(() => {
    // Mock Math.random to return a known value
    Math.random = () => 0.5;
  });

  afterEach(() => {
    // Restore the original Math.random after each test
    Math.random = originalRandom;
  });

  it('returns a number within the default range [0, 1]', () => {
    const result = random();
    expect(result).toBe(0.5);
  });

  it('returns a number within the specified range', () => {
    const min = 10;
    const max = 20;

    const result = random({ min, max });

    expect(result).toBe(15);
  });

  it('returns a number within a negative range', () => {
    const min = -20;
    const max = -10;

    const result = random({ min, max });

    expect(result).toBe(-15);
  });

  it('works when the min is greater than the max', () => {
    const min = 10;
    const max = 5;

    const result = random({ min, max });

    expect(result).toBe(7.5);
  });

  it('returns min when min and max are equal', () => {
    const min = 5;
    const max = 5;

    const result = random({ min, max });

    expect(result).toBe(min);
  });
});
