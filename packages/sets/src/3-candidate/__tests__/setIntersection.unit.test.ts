import { describe, expect, it } from 'vitest';

import { yieldEach } from '../../test-utils/yieldEach.ts';
import { setIntersection } from '../setIntersection.ts';

describe(setIntersection, () => {
  it.each([
    {
      label: 'returns only the shared elements when the sets overlap',
      aElements: new Set([1, 2]),
      bElements: new Set([2, 3]),
      expected: new Set([2]),
    },
    {
      label: 'returns an empty set when the sets have no elements in common',
      aElements: new Set([1]),
      bElements: new Set([2]),
      expected: new Set<number>(),
    },
    {
      label: 'returns an empty set when both sets are empty',
      aElements: new Set<number>(),
      bElements: new Set<number>(),
      expected: new Set<number>(),
    },
    {
      label: 'returns only the shared elements when the inputs are arrays',
      aElements: [1, 2],
      bElements: [2, 3],
      expected: new Set([2]),
    },
    {
      label: 'returns only the shared elements when the inputs are iterators',
      aElements: yieldEach([1, 2]),
      bElements: yieldEach([2, 3]),
      expected: new Set([2]),
    },
  ])('$label', ({ aElements, bElements, expected }) => {
    const actual = setIntersection(aElements, bElements);

    expect(actual).toStrictEqual(expected);
  });
});
