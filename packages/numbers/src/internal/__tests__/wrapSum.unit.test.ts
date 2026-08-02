import { describe, expect, it } from 'vitest';

import { wrapSum } from '../wrapSum.ts';

describe(wrapSum, () => {
  it('returns 0 when no addends are provided', () => {
    const max = 10;
    const expected = 0;

    const actual = wrapSum(max);

    expect(actual).toBe(expected);
  });

  it('returns the sum when it does not exceed the max', () => {
    const max = 10;
    const addends = [3, 4];
    const expected = 7;

    const actual = wrapSum(max, ...addends);

    expect(actual).toBe(expected);
  });

  it('wraps around when the sum exceeds the max', () => {
    const max = 10;
    const addends = [6, 5];
    const expected = 1;

    const actual = wrapSum(max, ...addends);

    expect(actual).toBe(expected);
  });

  it('can handle negative addends', () => {
    const max = 10;
    const addends = [5, -3];
    const expected = 2;

    const actual = wrapSum(max, ...addends);

    expect(actual).toBe(expected);
  });

  it('wraps around with negative sum', () => {
    const max = 10;
    const addends = [-5, -3];
    const expected = 2;

    const actual = wrapSum(max, ...addends);

    expect(actual).toBe(expected);
  });

  it('can handle large series of addends', () => {
    const max = 10;
    const addends = Array.from({ length: 1000 }, () => 5); // [5, 5, 5, ...]
    const expected = 0; // Because (5 * 1000) % 10 = 0

    const actual = wrapSum(max, ...addends);

    expect(actual).toBe(expected);
  });

  it('returns the modulo of single negative addend against max', () => {
    const max = 10;
    const addends = [-12];
    const expected = 8;

    const actual = wrapSum(max, ...addends);

    expect(actual).toBe(expected);
  });
});
