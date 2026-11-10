import { describe, expect, it } from 'vitest';

import { yieldEach } from '../../test-utils/yieldEach.ts';
import { setsAreEqual } from '../setsAreEqual.ts';

describe(setsAreEqual, () => {
  it.each([
    {
      condition: 'the sets have the same elements',
      aElements: new Set([1, 2]),
      bElements: new Set([2, 1]),
      expected: true,
    },
    { condition: 'both sets are empty', aElements: new Set<number>(), bElements: new Set<number>(), expected: true },
    {
      condition: 'the sets are of different size',
      aElements: new Set([1]),
      bElements: new Set([1, 2]),
      expected: false,
    },
    {
      condition: 'the sets have no elements in common',
      aElements: new Set([1, 2]),
      bElements: new Set([3, 4]),
      expected: false,
    },
    { condition: 'one set is empty', aElements: new Set<number>(), bElements: new Set([1, 2]), expected: false },
    { condition: 'the arrays have the same elements', aElements: [1, 2, 2], bElements: [2, 1], expected: true },
    { condition: 'the arrays have different elements', aElements: [1, 2], bElements: [1, 3], expected: false },
    {
      condition: 'the iterators yield the same elements',
      aElements: yieldEach([1, 2]),
      bElements: yieldEach([2, 1]),
      expected: true,
    },
  ])('returns $expected when $condition', ({ aElements, bElements, expected }) => {
    const actual = setsAreEqual(aElements, bElements);

    expect(actual).toBe(expected);
  });
});
