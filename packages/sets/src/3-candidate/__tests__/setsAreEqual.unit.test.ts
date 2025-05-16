import { describe, expect, it } from 'vitest';

import { setsAreEqual } from '../setsAreEqual.ts';

describe(setsAreEqual, () => {
  it('returns true if the sets are equal', () => {
    const aSet = new Set([1, 2]);
    const bSet = new Set([1, 2]);
    const expected = true;

    const actual = setsAreEqual(aSet, bSet);

    expect(actual).toBe(expected);
  });

  it('returns true if both sets are empty', () => {
    const aSet = new Set();
    const bSet = new Set();
    const expected = true;

    const actual = setsAreEqual(aSet, bSet);

    expect(actual).toBe(expected);
  });

  it.each([
    { label: 'the sets are of different size', aElements: [1], bElements: [1, 2] },
    { label: 'the sets have no elements in common', aElements: [1, 2], bElements: [3, 4] },
    { label: 'either of the sets is empty', aElements: [], bElements: [1, 2] },
  ])('returns false if $label', ({ aElements, bElements }) => {
    const expected = false;

    const actual = setsAreEqual(new Set(aElements), new Set(bElements));

    expect(actual).toBe(expected);
  });
});
