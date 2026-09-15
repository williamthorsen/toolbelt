import { describe, expect, it, vi } from 'vitest';

import { pickItem } from '../pickItem.ts';

describe(pickItem, () => {
  const sourceArray = [1, 2, 3, 4];

  it('returns one item', () => {
    const randomItem = pickItem(sourceArray);

    expect(sourceArray).toContain(randomItem);
  });

  it('if the array has a single item, returns the item', () => {
    expect(pickItem([1])).toBe(1);
  });

  it('if the array has a single item, draws once from the seed', () => {
    const seed = vi.fn<() => number>(() => 1_234);

    pickItem([1], { seed });

    expect(seed).toHaveBeenCalledTimes(1);
  });

  it('if the seed draws at the top of the range, returns the last item', () => {
    // This seed produces the highest draw that any seed can produce.
    const seed = 1_000_000_856_026_238;

    expect(pickItem(sourceArray, { seed })).toBe(4);
  });

  it('accepts a read-only array', () => {
    const frozenArray = Object.freeze([1, 2, 3, 4]);

    const item = pickItem(frozenArray);

    expect(frozenArray).toContain(item);
  });

  it('if the array is empty, throws an error', () => {
    const throwingFn = () => pickItem([]);

    expect(throwingFn).toThrow(new Error('Cannot pick an item from an empty array.'));
  });

  it('given the same seed, returns the same item', () => {
    const seed = 1_234;

    const randomItem1 = pickItem(sourceArray, { seed });
    const randomItem2 = pickItem(sourceArray, { seed });

    expect(randomItem1).toBe(randomItem2);
  });

  it('accepts a function as a seed', () => {
    const seed = 1_234;
    const seedFn = () => seed;

    const randomItem1 = pickItem(sourceArray, { seed });
    const randomItem2 = pickItem(sourceArray, { seed: seedFn });

    expect(randomItem1).toBe(randomItem2);
  });

  it('given an identical seed, always returns the same result', () => {
    const items = Array.from({ length: 1_000 }, (_, index) => index);
    const seeds = Array.from({ length: 5 }, (_, index) => index);
    const snapshot = [861, 3, 138, 281, 437];
    const results = seeds.map((seed) => pickItem(items, { seed }));

    expect(results).toStrictEqual(snapshot);
  });

  it('if the drawn item is undefined, returns it rather than throwing', () => {
    expect(pickItem<string | undefined>([undefined, undefined])).toBeUndefined();
  });
});
