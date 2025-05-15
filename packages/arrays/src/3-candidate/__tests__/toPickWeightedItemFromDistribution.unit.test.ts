import { describe, expect, it } from 'vitest';

import { toPickWeightedItemFromDistribution } from '../toPickWeightedItemFromDistribution.ts';

describe(toPickWeightedItemFromDistribution, () => {
  it('returns a function that picks an item based on weights', () => {
    const items = ['a', 'b', 'c'];
    const distribution = { a: 1, b: 2, c: 3 };
    const options = { getCategory: (item: string) => item };

    const pickItem = toPickWeightedItemFromDistribution(items, distribution, options);

    const pickedItem = pickItem();
    expect(typeof pickedItem).toBe('string');
    expect(items).toContain(pickedItem);
  });

  it('picks an item using a custom default weight', () => {
    const items = ['a', 'b', 'c'];
    const distribution = { a: 0, b: 0 };
    const options = { defaultWeight: 1, getCategory: (item: string) => item };

    const pickItem = toPickWeightedItemFromDistribution(items, distribution, options);
    const pickedItem = pickItem();

    expect(pickedItem).toBe('c');
  });

  // TODO: Throw an error instead of silently excluding negative weights.
  it('excludes items with zero or negative weights', () => {
    const items = ['a', 'b', 'c'];
    const distribution = { a: 1, b: 0, c: -1 };
    const options = { getCategory: (item: string) => item };

    const pickItem = toPickWeightedItemFromDistribution(items, distribution, options);
    const pickedItem = pickItem();

    expect(pickedItem).toBe('a');
  });

  it('uses the accessor function to get the name of the item', () => {
    const items = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    const distribution = { a: 1, b: 2, c: 3 };
    const options = { getCategory: (item: { name: string }) => item.name };

    const pickItem = toPickWeightedItemFromDistribution(items, distribution, options);
    const pickedItem = pickItem();

    expect(typeof pickedItem).toBe('object');
  });

  it('accepts read-only arrays', () => {
    const items = Object.freeze(['a', 'b', 'c']);
    const distribution = { a: 1, b: 2, c: 3 };
    const options = { getCategory: (item: string) => item };

    const pickItem = toPickWeightedItemFromDistribution(items, distribution, options);

    const pickedItem = pickItem();
    expect(items).toContain(pickedItem);
  });

  it('throws an error if all weights are zero or negative', () => {
    const items = ['a', 'b', 'c'];
    const distribution = { a: 0, b: -1, c: -2 };
    const options = { getCategory: (item: string) => item };

    const throwingFn = () => toPickWeightedItemFromDistribution(items, distribution, options);

    expect(throwingFn).toThrow(new Error('Cannot create function with an empty array.'));
  });

  it('throws an error if the items array is empty', () => {
    const items: string[] = [];
    const distribution = { a: 1, b: 2, c: 3 };
    const options = { getCategory: (item: string) => item };

    const throwingFn = () => toPickWeightedItemFromDistribution(items, distribution, options);

    expect(throwingFn).toThrow(new Error('Cannot create function with an empty array.'));
  });

  it('accepts and uses options when picking an item', () => {
    const items = ['a', 'b', 'c'];
    const distribution = { a: 1, b: 2, c: 3 };
    const options = { getCategory: (item: string) => item };
    const pickOptions = { seed: 1234 };

    const pickItem = toPickWeightedItemFromDistribution(items, distribution, options);

    const pickedItem1 = pickItem(pickOptions);
    const pickedItem2 = pickItem(pickOptions);

    expect(pickedItem1).toBe(pickedItem2);
  });
});
