import { describe, expect, it } from 'vitest';

import { getSetItems } from '../getSetItems.ts';

describe(getSetItems, () => {
  it('should remove duplicate items from an array', () => {
    const array = [1, 2, 3, 3, 2, 1];
    const expected = [1, 2, 3];

    const setItems = getSetItems(array);

    expect(setItems).toStrictEqual(expected);
  });

  it('given an empty array, should return an empty array', () => {
    const array: number[] = [];
    const expected: number[] = [];

    const setItems = getSetItems(array);

    expect(setItems).toStrictEqual(expected);
  });

  it('given an array without duplicates, should return the same array', () => {
    const array = [1, 2, 3];
    const expected = [1, 2, 3];

    const setItems = getSetItems(array);

    expect(setItems).toStrictEqual(expected);
  });

  it('can handle items of mixed types', () => {
    const array = [1, 'a', false, null, undefined, true];
    const expected = [1, 'a', false, null, undefined, true];

    const setItems = getSetItems(array);

    expect(setItems).toStrictEqual(expected);
  });

  it('can handle iterables other than arrays', () => {
    const toGenerateInt = function* () {
      yield 1;
      yield 1;
      yield 2;
      yield 1;
    };
    const expected = [1, 2];

    const setItems = getSetItems(toGenerateInt());

    expect(setItems).toStrictEqual(expected);
  });
});
