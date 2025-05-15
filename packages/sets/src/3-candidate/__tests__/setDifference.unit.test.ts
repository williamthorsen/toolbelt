import { assertEquals, describe, it } from '../../dev_deps.ts';

import { setDifference } from '../setDifference.ts';

describe('setDifference(iterable1, iterable2)', () => {
  it('returns set 1 when the two iterables have no elements in common', () => {
    const set1 = new Set([1, 2]);
    const set2 = new Set([3, 4]);
    const expected = set1;

    const actual = setDifference(set1, set2);

    assertEquals(actual, expected);
  });

  it('returns an empty set when iterable 1 is a subset of iterable 2', () => {
    const set1 = new Set([1, 2]);
    const set2 = new Set([1, 2, 3]);
    const expected = new Set([]);

    const actual = setDifference(set1, set2);

    assertEquals(actual, expected);
  });

  it('returns the elements exclusive to iterable 1 when the iterables intersect', () => {
    const set1 = new Set([1, 2]);
    const set2 = new Set([2, 3]);
    const expected = new Set([1]);

    const actual = setDifference(set1, set2);

    assertEquals(actual, expected);
  });

  it('works with arrays', () => {
    const array1 = new Set([1, 2]);
    const array2 = new Set([2, 3]);
    const expected = new Set([1]);

    const actual = setDifference(array1, array2);

    assertEquals(actual, expected);
  });
});
