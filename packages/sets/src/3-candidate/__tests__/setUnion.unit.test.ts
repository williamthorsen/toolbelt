import { describe, expect, it } from 'vitest';

import { setUnion } from '../setUnion.ts';

describe(setUnion, () => {
  it('returns a Set containing all elements of sets A and B', () => {
    const aSet = new Set([1, 2]);
    const bSet = new Set([2, 3]);
    const expected = new Set([1, 2, 3]);

    const actual = setUnion(aSet, bSet);

    expect(actual).toStrictEqual(expected);
  });

  it('if one set is empty, returns the other set', () => {
    const aSet = new Set([1, 2]);
    const bSet = new Set();
    const expected = new Set([1, 2]);

    const actual = setUnion(aSet, bSet);

    expect(actual).toStrictEqual(expected);
  });

  it('if both sets are empty, returns the empty set', () => {
    const aSet = new Set();
    const bSet = new Set();
    const expected = new Set();

    const actual = setUnion(aSet, bSet);

    expect(actual).toStrictEqual(expected);
  });

  it('works with arrays', () => {
    const aSet = [1, 2];
    const bSet = [2, 3];
    const expected = new Set([1, 2, 3]);

    const actual = setUnion(aSet, bSet);

    expect(actual).toStrictEqual(expected);
  });
});
