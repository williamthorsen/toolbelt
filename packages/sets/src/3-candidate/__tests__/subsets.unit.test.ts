import { describe, expect, it } from 'vitest';

import { yieldEach } from '../../test-utils/yieldEach.ts';
import { setIsSubset, setIsSuperset } from '../setIsSubset.ts';

describe(setIsSubset, () => {
  it.each([
    {
      condition: 'every element of the child is in the parent',
      child: () => new Set([1, 2]),
      parent: () => new Set([3, 2, 1]),
      expected: true,
    },
    {
      condition: 'the sets are identical',
      child: () => new Set([0]),
      parent: () => new Set([0]),
      expected: true,
    },
    {
      condition: 'the child is empty',
      child: () => new Set<number>(),
      parent: () => new Set([1]),
      expected: true,
    },
    {
      condition: 'both sets are empty',
      child: () => new Set<number>(),
      parent: () => new Set<number>(),
      expected: true,
    },
    {
      condition: 'the parent is empty and the child is not',
      child: () => new Set([0]),
      parent: () => new Set<number>(),
      expected: false,
    },
    {
      condition: 'the inputs are arrays and the child is contained in the parent',
      child: () => [1, 2],
      parent: () => [3, 2, 1],
      expected: true,
    },
    {
      condition: 'the inputs are iterators and the child is contained in the parent',
      child: () => yieldEach([1, 2]),
      parent: () => yieldEach([3, 2, 1]),
      expected: true,
    },
    {
      condition: 'the inputs are iterators and the child has an element absent from the parent',
      child: () => yieldEach([1, 4]),
      parent: () => yieldEach([3, 2, 1]),
      expected: false,
    },
  ])(
    'returns $expected when $condition, as does setIsSuperset with the arguments swapped',
    ({ child, parent, expected }) => {
      const actual = setIsSubset(child(), parent());
      const reverse = setIsSuperset(parent(), child());

      expect(actual).toBe(expected);
      expect(reverse).toBe(expected);
    },
  );
});
