import { describe, expect, it } from 'vitest';

import { toAddendsFromCumulativeSums } from '../toAddendsFromCumulativeSums.ts';

describe(toAddendsFromCumulativeSums, () => {
  it('returns the addends that progressively add up to the cumulative sums', () => {
    expect(toAddendsFromCumulativeSums([1, 3, 6, 10.5])).toStrictEqual([1, 2, 3, 4.5]);
  });

  it('returns a new empty array if given an empty array', () => {
    const cumulativeSums: number[] = [];

    const addends = toAddendsFromCumulativeSums(cumulativeSums);

    expect(addends).toStrictEqual([]);
    expect(addends).not.toBe(cumulativeSums);
  });

  it('returns a new array with the same single element if given a single-element array', () => {
    const cumulativeSums = [1];

    const addends = toAddendsFromCumulativeSums(cumulativeSums);

    expect(addends).toStrictEqual([1]);
    expect(addends).not.toBe(cumulativeSums);
  });

  it('accepts negative cumulative sums and can return negative addends', () => {
    expect(toAddendsFromCumulativeSums([-1, 3, -6, 10.5])).toStrictEqual([-1, 4, -9, 16.5]);
  });
});
