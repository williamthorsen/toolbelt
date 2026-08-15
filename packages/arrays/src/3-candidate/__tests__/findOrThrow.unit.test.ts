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

    expect(throwingFn).toThrow(new Error('Could not find item.'));
  });

  it('if the array is empty, throws an error', () => {
    const items: number[] = [];
    const predicate = (item: number) => !!item;

    const throwingFn = () => findOrThrow(items, predicate);

    expect(throwingFn).toThrow(new Error('Could not find item.'));
  });

  it('if a label is given in the options, uses the label in the error message', () => {
    const options = { label: 'element' };

    const throwingFn = () => findOrThrow([], () => false, options);

    expect(throwingFn).toThrow(new Error('Could not find element.'));
  });

  it('if the matching item is falsy, returns it rather than treating it as not found', () => {
    expect(findOrThrow([0, 1], (item) => item === 0)).toBe(0);
  });

  it('if the matching item is undefined, returns it rather than throwing', () => {
    expect(findOrThrow<string | undefined>(['a', undefined], (item) => item === undefined)).toBeUndefined();
  });
});
