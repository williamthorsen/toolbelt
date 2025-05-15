import { assertEquals, describe, it } from '../../dev_deps.ts';

import { setsAreEqual } from '../setsAreEqual.ts';

describe('setsEqual()', () => {
  it('returns true if the sets are equal', () => {
    const aSet = new Set([1, 2]);
    const bSet = new Set([1, 2]);
    const expected = true;

    const actual = setsAreEqual(aSet, bSet);

    assertEquals(actual, expected);
  });

  it('returns true if both sets are empty', () => {
    const aSet = new Set();
    const bSet = new Set();
    const expected = true;

    const actual = setsAreEqual(aSet, bSet);

    assertEquals(actual, expected);
  });

  const useCases = [
    ['the sets are of different size', [1], [1, 2]],
    ['the sets have no elements in common', [1, 2], [3, 4]],
    ['either of the sets is empty', [], [1, 2]],
  ] as const;
  useCases.forEach(([label, aElements, bElements]) => {
    it(`returns false if ${label}`, () => {
      const expected = false;

      const actual = setsAreEqual(new Set(aElements), new Set(bElements));

      assertEquals(actual, expected);
    });
  });
});
