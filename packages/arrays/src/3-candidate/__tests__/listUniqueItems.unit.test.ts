import { describe, expect, it } from 'vitest';

import { listUniqueItems } from '../listUniqueItems.ts';

describe(listUniqueItems, () => {
  it('should return an array with all unique values', () => {
    const array = [1, 1, 2, 1];
    const expected = [1, 2];

    const unique = listUniqueItems(array);

    expect(unique).toStrictEqual(expected);
  });

  it('given an array without duplicates, should return the same array values in order', () => {
    const array = [1, 2, 3];
    const expected = [1, 2, 3];

    const unique = listUniqueItems(array);

    expect(unique).toStrictEqual(expected);
  });

  it('given an empty array, should return an empty array', () => {
    const array = [] as const;
    const expected: number[] = [];

    const unique = listUniqueItems(array);

    expect(unique).toStrictEqual(expected);
  });

  it('can handle items of mixed types', () => {
    const array = [1, 'a', false, null, undefined, null];
    const expected = [1, 'a', false, null, undefined];

    const unique = listUniqueItems(array);

    expect(unique).toStrictEqual(expected);
  });

  it('can handle iterables other than arrays', () => {
    const toGenerateInt = function* () {
      yield 1;
      yield 1;
      yield 2;
      yield 1;
    };
    const expected = [1, 2];

    const unique = listUniqueItems(toGenerateInt());

    expect(unique).toStrictEqual(expected);
  });
});
