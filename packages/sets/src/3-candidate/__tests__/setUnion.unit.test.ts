import { describe, expect, it } from 'vitest';

import { yieldEach } from '../../test-utils/yieldEach.ts';
import { setUnion } from '../setUnion.ts';

describe(setUnion, () => {
  it.each([
    {
      label: 'returns every element of both when the sets overlap',
      aElements: new Set([1, 2]),
      bElements: new Set([2, 3]),
      expected: new Set([1, 2, 3]),
    },
    {
      label: 'returns the other set when one set is empty',
      aElements: new Set([1, 2]),
      bElements: new Set<number>(),
      expected: new Set([1, 2]),
    },
    {
      label: 'returns an empty set when both sets are empty',
      aElements: new Set<number>(),
      bElements: new Set<number>(),
      expected: new Set<number>(),
    },
    {
      label: 'returns every element of both when the inputs are arrays',
      aElements: [1, 2],
      bElements: [2, 3],
      expected: new Set([1, 2, 3]),
    },
    {
      label: 'returns every element of both when the inputs are iterators',
      aElements: yieldEach([1, 2]),
      bElements: yieldEach([2, 3]),
      expected: new Set([1, 2, 3]),
    },
  ])('$label', ({ aElements, bElements, expected }) => {
    const actual = setUnion(aElements, bElements);

    expect(actual).toStrictEqual(expected);
  });
});
