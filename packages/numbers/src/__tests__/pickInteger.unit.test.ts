import { afterEach, describe, expect, it, vi } from 'vitest';

import { pickInteger } from '../pickInteger.ts';

describe('pickInteger()', () => {
  const mathRandomSpy = vi.spyOn(Math, 'random');

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it('returns an integer', () => {
    const randomInt = pickInteger();

    expect(Number.isInteger(randomInt)).toBe(true);
    expect(Number.MAX_SAFE_INTEGER).toBe(9_007_199_254_740_991);
  });

  it('returns a value no less than the min', () => {
    const min = 1;
    const max = 1000;
    vi.spyOn(Math, 'random').mockImplementation(() => 0);

    const randomInt = pickInteger({ min, max });

    expect(randomInt).toBe(min);
  });

  it('returns a value no greater than the max', () => {
    const min = 1;
    const max = 1000;
    vi.spyOn(Math, 'random').mockImplementation(() => 0.999_999);

    const randomInt = pickInteger({ min, max });

    expect(randomInt).toBe(max);
  });

  it('if min is one integer smaller than max, returns the truncated value of min or max', () => {
    const min = 1.1;
    const max = 2.1;

    vi.spyOn(Math, 'random').mockImplementation(() => 0);
    const minRandomInt = pickInteger({ min, max });
    expect(minRandomInt).toBe(Math.trunc(min));

    vi.spyOn(Math, 'random').mockImplementation(() => 0.999_999);
    const maxRandomInt = pickInteger({ min, max });
    expect(maxRandomInt).toBe(Math.trunc(max));
  });

  it('if min > max, throws an error', () => {
    const min = 0;
    const max = -50;

    const throwingFn = vi.fn<() => number>(() => pickInteger({ min, max }));

    expect(throwingFn).toThrow(new RangeError('Invalid range: min must be less than or equal to max.'));
  });

  it('if min and max truncate to the same integer, returns their truncated value', () => {
    const min = 1.1;
    const max = 1.9;
    const expected = 1;

    vi.spyOn(Math, 'random').mockImplementation(() => 0);
    expect(pickInteger({ min, max })).toBe(expected);

    vi.spyOn(Math, 'random').mockImplementation(() => 0.999_999);
    expect(pickInteger({ min, max })).toBe(expected);
  });

  it('if only max argument is given, sets min=0', () => {
    const max = 10;
    vi.spyOn(Math, 'random').mockImplementation(() => 0);

    const randomInt = pickInteger({ max });

    expect(randomInt).toBe(0);
  });

  it('if a seed is given, always returns the same value for that seed', () => {
    const params = {
      min: 1,
      max: 10_000,
      seed: 0.123_456,
    };

    const randomInt1 = pickInteger(params);
    const randomInt2 = pickInteger(params);

    expect(randomInt2).toBe(randomInt1);
  });

  it('accepts a function as a seed', () => {
    const seed = 1234;
    const seedFn = vi.fn<() => number>(() => 1234);

    const randomInt1 = pickInteger({ max: 10, seed });
    const randomInt2 = pickInteger({ max: 10, seed: seedFn });

    expect(randomInt1).toBe(randomInt2);
  });

  it('if min is infinite, throws an error', () => {
    const min = -Infinity;
    const max = 10;

    const throwingFn = vi.fn<() => number>(() => pickInteger({ min, max }));

    expect(throwingFn).toThrow(new RangeError('Invalid range: min and max must be finite.'));
  });

  it('if max is infinite, throws an error', () => {
    const min = 0;
    const max = Infinity;

    const throwingFn = vi.fn<() => number>(() => pickInteger({ min, max }));

    expect(throwingFn).toThrow(new RangeError('Invalid range: min and max must be finite.'));
  });
});
