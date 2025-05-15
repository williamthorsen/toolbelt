import { describe, expect, it } from 'vitest';

import { setIsSubset, setIsSuperset } from '../setIsSubset.ts';

describe(setIsSubset, () => {
  it('returns true all elements in set A are in set B', () => {
    const aSet = new Set([1, 2]);
    const bSet = new Set([3, 2, 1]);
    const expected = true;

    const actual = setIsSubset(aSet, bSet);
    const reverse = setIsSuperset(bSet, aSet);

    expect(actual).toBe(expected);
    expect(reverse).toBe(expected);
  });

  it('returns true if the sets are identical', () => {
    const aSet = new Set(['']);
    const bSet = new Set(['']);
    const expected = true;

    const actual = setIsSubset(aSet, bSet);
    const reverse = setIsSuperset(bSet, aSet);

    expect(actual).toBe(expected);
    expect(reverse).toBe(expected);
  });

  it('returns true if set A is empty', () => {
    const aSet = new Set();
    const bSet = new Set([1]);
    const expected = true;

    const actual = setIsSubset(aSet, bSet);
    const reverse = setIsSuperset(bSet, aSet);

    expect(actual).toBe(expected);
    expect(reverse).toBe(expected);
  });

  it('returns true if both sets are empty', () => {
    const aSet = new Set();
    const bSet = new Set();
    const expected = true;

    const actual = setIsSubset(aSet, bSet);
    const reverse = setIsSuperset(bSet, aSet);

    expect(actual).toBe(expected);
    expect(reverse).toBe(expected);
  });

  it('returns false if set B is empty and set A is not', () => {
    const aSet = new Set([0]);
    const bSet = new Set();

    const expected = false;

    const actual = setIsSubset(aSet, bSet);
    const reverse = setIsSuperset(bSet, aSet);

    expect(actual).toBe(expected);
    expect(reverse).toBe(expected);
  });

  it('works with arrays', () => {
    const aSet = [1, 2];
    const bSet = [3, 2, 1];
    const expected = true;

    const actual = setIsSubset(aSet, bSet);
    const reverse = setIsSuperset(bSet, aSet);

    expect(actual).toBe(expected);
    expect(reverse).toBe(expected);
  });
});
