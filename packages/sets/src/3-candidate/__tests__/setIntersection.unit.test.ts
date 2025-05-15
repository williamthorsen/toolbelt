import { assertEquals, describe, it } from '../../dev_deps.ts';

import { setIntersection } from '../setIntersection.ts';

describe('setIntersection()', () => {
  it('returns a Set containing the common elements of sets A and B', () => {
    const aSet = new Set([1, 2]);
    const bSet = new Set([2, 3]);
    const expected = new Set([2]);

    const actual = setIntersection(aSet, bSet);

    assertEquals(actual, expected);
  });

  it('if there are no common elements, returns the empty set', () => {
    const aSet = new Set([1]);
    const bSet = new Set([2]);
    const expected = new Set([]);

    const actual = setIntersection(aSet, bSet);

    assertEquals(actual, expected);
  });

  it('if both sets are empty, returns the empty set', () => {
    const aSet = new Set([]);
    const bSet = new Set([]);
    const expected = new Set([]);

    const actual = setIntersection(aSet, bSet);

    assertEquals(actual, expected);
  });

  it('works with arrays', () => {
    const aSet = [1, 2];
    const bSet = [2, 3];
    const expected = new Set([2]);

    const actual = setIntersection(aSet, bSet);

    assertEquals(actual, expected);
  });
});
