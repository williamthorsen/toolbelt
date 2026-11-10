import { describe, expect, it } from 'vitest';

import { yieldEach } from '../../test-utils/yieldEach.ts';
import { setSymmetricDifference } from '../setSymmetricDifference.ts';

describe(setSymmetricDifference, () => {
  it.each([
    {
      label: 'returns the elements in exactly one set when the sets overlap',
      aElements: new Set([1, 2]),
      bElements: new Set([2, 3]),
      expected: new Set([1, 3]),
    },
    {
      label: 'returns an empty set when the sets are identical',
      aElements: new Set([1, 2]),
      bElements: new Set([2, 1]),
      expected: new Set<number>(),
    },
    {
      label: 'returns the elements in exactly one input when the inputs are arrays',
      aElements: [1, 2],
      bElements: [2, 3],
      expected: new Set([1, 3]),
    },
    {
      label: 'returns the elements in exactly one input when the inputs are iterators',
      aElements: yieldEach([1, 2]),
      bElements: yieldEach([2, 3]),
      expected: new Set([1, 3]),
    },
  ])('$label', ({ aElements, bElements, expected }) => {
    const actual = setSymmetricDifference(aElements, bElements);

    expect(actual).toStrictEqual(expected);
  });
});
