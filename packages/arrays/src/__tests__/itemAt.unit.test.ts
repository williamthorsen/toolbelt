import { describe, expect, it } from 'vitest';

import { itemAt } from '../itemAt.ts';

describe('itemAt()', () => {
  it('returns the correct item at the specified index', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const index = 2;
    const expectedItem = 'c';

    const item = itemAt(arr, index);

    expect(item).toBe(expectedItem);
  });

  it('throws a RangeError if the index is negative', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const index = -1;

    const throwingFn = () => itemAt(arr, index);

    expect(throwingFn).toThrow(new RangeError('Index -1 is out of bounds.'));
  });

  it('throws a RangeError if the index is greater than or equal to the array length', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const index = 4;

    const throwingFn = () => itemAt(arr, index);

    expect(throwingFn).toThrow(new RangeError('Index 4 is out of bounds.'));
  });

  it('returns the correct item for the first index in the array', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const index = 0;
    const expectedItem = 'a';

    const item = itemAt(arr, index);

    expect(item).toBe(expectedItem);
  });

  it('returns the correct item for the last index in the array', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const index = 3;
    const expectedItem = 'd';

    const item = itemAt(arr, index);

    expect(item).toBe(expectedItem);
  });
});
