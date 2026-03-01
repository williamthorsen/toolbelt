import { describe, expect, it } from 'vitest';

import { findOrThrow } from '../findOrThrow.ts';

describe(findOrThrow, () => {
  it('if an item satisfying the predicate is found, returns it', () => {
    const items = [1, 2, 3];
    const predicate = (item: number) => item === 2;

    const foundItem = findOrThrow(items, predicate);

    expect(foundItem).toBe(2);
  });

  it('if no item satisfying the predicate is found, throws an error', () => {
    const items = [1, 2, 3];
    const predicate = (item: number) => item === 4;

    const throwingFn = () => findOrThrow(items, predicate);

    expect(throwingFn).toThrowError(new Error('Could not find item.'));
  });

  it('if the array is empty, throws an error', () => {
    const items: number[] = [];
    const predicate = (item: number) => !!item;

    const throwingFn = () => findOrThrow(items, predicate);

    expect(throwingFn).toThrowError(new Error('Could not find item.'));
  });

  it('if a label is given in the options, uses the label in the error message', () => {
    const options = { label: 'element' };

    const throwingFn = () => findOrThrow([], () => false, options);

    expect(throwingFn).toThrowError(new Error('Could not find element.'));
  });
});
