import { describe, expect, it } from 'vitest';

import { toCumulativeSumsFromAddends } from '../toCumulativeSumsFromAddends.ts';

describe(toCumulativeSumsFromAddends, () => {
  it('returns the cumulative sums of the addends', () => {
    expect(toCumulativeSumsFromAddends([1, 2, 3, 4.5])).toStrictEqual([1, 3, 6, 10.5]);
  });

  it('returns a new empty array if given an empty array', () => {
    const expectedSums: number[] = [];

    const sums = toCumulativeSumsFromAddends([]);

    expect(sums).toStrictEqual(expectedSums);
    expect(sums).not.toBe(expectedSums);
  });

  it('returns a new array with the same single element if given a single-element array', () => {
    const expectedSums = [1];

    const sums = toCumulativeSumsFromAddends([1]);

    expect(sums).toStrictEqual(expectedSums);
    expect(sums).not.toBe(expectedSums);
  });

  it('accepts negative addends and can return negative cumulative sums', () => {
    expect(toCumulativeSumsFromAddends([-1, 4, -9, 16.5])).toStrictEqual([-1, 3, -6, 10.5]);
  });
});
