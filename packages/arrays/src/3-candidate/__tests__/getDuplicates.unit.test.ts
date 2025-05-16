import { describe, expect, it } from 'vitest';

import { getDuplicates } from '../getDuplicates.ts';

describe(getDuplicates, () => {
  it('should return an array containing one of each duplicate value', () => {
    const array = [1, 1, 2, 1];
    const expected = [1];

    const duplicates = getDuplicates(array);

    expect(duplicates).toStrictEqual(expected);
  });

  it('given an array without duplicates, should return an empty array', () => {
    const array = [1, 2, 3];
    const expected: number[] = [];

    const duplicates = getDuplicates(array);

    expect(duplicates).toStrictEqual(expected);
  });

  it('given an empty array, should return an empty array', () => {
    const array = [] as const;
    const expected: number[] = [];

    const duplicates = getDuplicates(array);

    expect(duplicates).toStrictEqual(expected);
  });

  it('can handle items of mixed types', () => {
    const array = [1, 'a', false, null, undefined, null];
    const expected = [null];

    const duplicates = getDuplicates(array);

    expect(duplicates).toStrictEqual(expected);
  });

  it('can handle iterables other than arrays', () => {
    const toGenerateInt = function* () {
      yield 1;
      yield 1;
      yield 2;
      yield 1;
    };
    const expected = [1];

    const duplicates = getDuplicates(toGenerateInt());

    expect(duplicates).toStrictEqual(expected);
  });
});
