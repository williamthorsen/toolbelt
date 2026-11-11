import { describe, expect, it } from 'vitest';

import { toCumulativeSumsFromAddends } from '../toCumulativeSumsFromAddends.ts';

describe(toCumulativeSumsFromAddends, () => {
  it('returns the cumulative sums of the addends', () => {
    expect(toCumulativeSumsFromAddends([1, 2, 3, 4.5])).toStrictEqual([1, 3, 6, 10.5]);
  });

  it('returns a new empty array if given an empty array', () => {
    const addends: number[] = [];

    const sums = toCumulativeSumsFromAddends(addends);

    expect(sums).toStrictEqual([]);
    expect(sums).not.toBe(addends);
  });

  it('returns a new array with the same single element if given a single-element array', () => {
    const addends = [1];

    const sums = toCumulativeSumsFromAddends(addends);

    expect(sums).toStrictEqual([1]);
    expect(sums).not.toBe(addends);
  });

  it('accepts negative addends and can return negative cumulative sums', () => {
    expect(toCumulativeSumsFromAddends([-1, 4, -9, 16.5])).toStrictEqual([-1, 3, -6, 10.5]);
  });
});
