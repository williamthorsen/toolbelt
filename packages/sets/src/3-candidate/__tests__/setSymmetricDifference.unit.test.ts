import { assertEquals, describe, it } from '../../dev_deps.ts';

import { setSymmetricDifference } from '../setSymmetricDifference.ts';

describe('setSymmetricDifference()', () => {
  it('returns elements that are in set A or set B but not both', () => {
    const aSet = new Set([1, 2]);
    const bSet = new Set([2, 3]);
    const expected = new Set([1, 3]);

    const actual = setSymmetricDifference(aSet, bSet);

    assertEquals(actual, expected);
  });

  it('if the sets are the identical, returns an empty set', () => {
    const aSet = new Set([1, 2]);
    const bSet = new Set([2, 1]);
    const expected = new Set();

    const actual = setSymmetricDifference(aSet, bSet);

    assertEquals(actual, expected);
  });

  it('works with arrays', () => {
    const aElements = [1, 2];
    const bElements = [2, 3];
    const expected = new Set([1, 3]);

    const actual = setSymmetricDifference(aElements, bElements);

    assertEquals(actual, expected);
  });
});
