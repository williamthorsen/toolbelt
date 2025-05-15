import { assertEquals, describe, it } from '../../dev_deps.ts';

import { objectSize } from '../objectSize.ts';

describe('objectSize()', () => {
  it('if the value is a nonempty object, returns the number of keys', () => {
    const input = { a: 1, b: 2, c: 3 };
    const expected = 3;

    const actual = objectSize(input);

    assertEquals(actual, expected);
  });

  it('if the value is an empty object, returns 0', () => {
    const input = {};
    const expected = 0;

    const actual = objectSize(input);

    assertEquals(actual, expected);
  });

  it('if the value is null, returns 0', () => {
    const input = null;
    const expected = 0;

    const actual = objectSize(input);

    assertEquals(actual, expected);
  });

  it('if the value is an array, returns the length of the array', () => {
    const input = [1, 2, 3];
    const expected = 3;

    const actual = objectSize(input);

    assertEquals(actual, expected);
  });
});
