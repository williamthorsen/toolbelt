import { describe, expect, it } from 'vitest';

import { yieldEach } from '../../test-utils/yieldEach.ts';
import { setDifference } from '../setDifference.ts';

describe(setDifference, () => {
  it.each([
    {
      label: 'returns every element of the first when the sets have no elements in common',
      aElements: new Set([1, 2]),
      bElements: new Set([3, 4]),
      expected: new Set([1, 2]),
    },
    {
      label: 'returns an empty set when the first is a subset of the second',
      aElements: new Set([1, 2]),
      bElements: new Set([1, 2, 3]),
      expected: new Set<number>(),
    },
    {
      label: 'returns the elements exclusive to the first when the sets overlap',
      aElements: new Set([1, 2]),
      bElements: new Set([2, 3]),
      expected: new Set([1]),
    },
    {
      label: 'returns the elements exclusive to the first when the inputs are arrays',
      aElements: [1, 2],
      bElements: [2, 3],
      expected: new Set([1]),
    },
    {
      label: 'returns the elements exclusive to the first when the inputs are iterators',
      aElements: yieldEach([1, 2]),
      bElements: yieldEach([2, 3]),
      expected: new Set([1]),
    },
  ])('$label', ({ aElements, bElements, expected }) => {
    const actual = setDifference(aElements, bElements);

    expect(actual).toStrictEqual(expected);
  });
});
