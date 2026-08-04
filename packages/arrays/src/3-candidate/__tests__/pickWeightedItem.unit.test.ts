import { describe, expect, it } from 'vitest';

import { pickItem } from '../pickItem.ts';
import { pickWeightedItem } from '../pickWeightedItem.ts';

describe(pickWeightedItem, () => {
  it('returns one item from the array using weights', () => {
    const items = [1, 2, 3, 4];
    const weights = [1, 1, 1, 1];

    const pickItem = pickWeightedItem(items, weights);

    expect(items).toContain(pickItem());
  });

  it('if the array has a single item, returns the item', () => {
    const items = [1];
    const weights = [1];

    const pickItem = pickWeightedItem(items, weights);

    expect(pickItem()).toBe(1);
  });

  it('accepts a read-only array', () => {
    const items = Object.freeze([1, 2, 3, 4]);
    const weights = Object.freeze([1, 1, 1, 1]);

    const pickItem = pickWeightedItem(items, weights);

    expect(items).toContain(pickItem());
  });

  it('if the array is empty, throws an error', () => {
    const throwingFn = () => pickWeightedItem([], []);

    expect(throwingFn).toThrow(new Error('Cannot pick an item from an empty array.'));
  });

  it('throws an error if weights array and items array are of different lengths', () => {
    const items = [1, 2, 3, 4];
    const weights = [1, 1];

    const throwingFn = () => pickWeightedItem(items, weights);

    expect(throwingFn).toThrow(new Error('The number of weights must match the number of items.'));
  });

  it('allows a seed in options to produce deterministic results', () => {
    const items = [1, 2, 3, 4];
    const weights = [1, 1, 1, 1];
    const options = { seed: 12_345 };

    const pickItem = pickWeightedItem(items, weights);

    expect(pickItem(options)).toBe(pickItem(options));
  });

  it('returns results identical to pickItem when weights are uniform', () => {
    const seed = 12_345;
    const items = [1, 2, 3, 4];
    const weights = [1, 1, 1, 1];
    const expected = pickItem(items, { seed });

    const actual = pickWeightedItem(items, weights)({ seed });

    expect(actual).toBe(expected);
  });

  it('given an identical seed, always returns the same result', () => {
    const items = Array.from({ length: 1_000 }, (_, index) => index);
    const weights = items; // use item values as weights, since we care only about consistency
    const seeds = Array.from({ length: 5 }, (_, index) => index);
    const snapshot = [928, 57, 371, 530, 661];

    const results = seeds.map((seed) => pickWeightedItem(items, weights)({ seed }));

    expect(results).toStrictEqual(snapshot);
  });
});
