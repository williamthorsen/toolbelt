import { describe, expect, it } from 'vitest';

import { toAddendsFromCumulativeSums } from '../toAddendsFromCumulativeSums.ts';

describe(toAddendsFromCumulativeSums, () => {
  it('returns the addends that progressively add up to the cumulative sums', () => {
    expect(toAddendsFromCumulativeSums([1, 3, 6, 10.5])).toStrictEqual([1, 2, 3, 4.5]);
  });

  it('returns a new empty array if given an empty array', () => {
    const expectedAddends: number[] = [];

    const addends = toAddendsFromCumulativeSums([]);

    expect(addends).toStrictEqual(expectedAddends);
    expect(addends).not.toBe(expectedAddends);
  });

  it('returns a new array with the same single element if given a single-element array', () => {
    const expectedAddends = [1];

    const addends = toAddendsFromCumulativeSums([1]);

    expect(addends).toStrictEqual(expectedAddends);
    expect(addends).not.toBe(expectedAddends);
  });

  it('accepts negative cumulative sums and can return negative addends', () => {
    expect(toAddendsFromCumulativeSums([-1, 3, -6, 10.5])).toStrictEqual([-1, 4, -9, 16.5]);
  });
});
