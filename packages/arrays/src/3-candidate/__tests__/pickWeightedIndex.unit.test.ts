import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertValidCumulativeWeights, pickWeightedIndex } from '../pickWeightedIndex.ts';

describe(pickWeightedIndex, () => {
  const mathRandomSpy = vi.spyOn(Math, 'random');

  afterEach(() => {
    mathRandomSpy.mockReset();
  });

  it('returns an integer index from the cumulative weights array', () => {
    mathRandomSpy.mockReturnValue(0.999_999);
    const cumulativeWeights = [1, 2, 3, 4];
    const index = pickWeightedIndex(cumulativeWeights);

    expect(Number.isInteger(index)).toBe(true);
    expect(index).toBe(3);
  });

  it('if the cumulative weights array has a single element, returns the index 0', () => {
    const cumulativeWeights = [1];

    const index = pickWeightedIndex(cumulativeWeights);

    expect(Number.isInteger(index)).toBe(true);
    expect(index).toBe(0);
  });

  it('accepts a read-only cumulative weights array', () => {
    mathRandomSpy.mockReturnValue(0.6);
    const cumulativeWeights = Object.freeze([1, 2, 3, 4]);

    const index = pickWeightedIndex(cumulativeWeights);

    expect(Number.isInteger(index)).toBe(true);
    expect(index).toBe(2);
  });

  it('if the cumulative weights array is empty, throws an error', () => {
    const throwingFn = () => pickWeightedIndex([]);

    expect(throwingFn).toThrowError(new Error('Cannot pick an item from an empty array.'));
  });

  it('if the total weight is 0, throws an error', () => {
    const throwingFn = () => pickWeightedIndex([0, 0]);

    expect(throwingFn).toThrowError(new Error('Cannot pick an item from an array with total weight 0.'));
  });

  it('allows a seed in options to produce deterministic results', () => {
    const cumulativeWeights = [1, 2, 3, 4];
    const options = { seed: 12_345 };

    const index1 = pickWeightedIndex(cumulativeWeights, options);
    const index2 = pickWeightedIndex(cumulativeWeights, options);

    expect(index1).toBe(index2);
  });

  it('returns an index such that 0 <= index < cumulativeWeights.length', () => {
    const cumulativeWeights = [1, 2, 3, 4];

    mathRandomSpy.mockReturnValue(0);
    const weightedIndex = pickWeightedIndex(cumulativeWeights);
    // expect the first index when random value is 0
    expect(weightedIndex).toBe(0);

    mathRandomSpy.mockReturnValue(0.999_999);
    expect(Math.random()).toBeCloseTo(0.999_999, 6);
    // expect the last index when random value is close to 1
    expect(pickWeightedIndex(cumulativeWeights)).toBe(cumulativeWeights.length - 1);
  });
});

describe(assertValidCumulativeWeights, () => {
  it('if the weights array does not have the same number of elements as the primary array, throws an error', () => {
    const items = [1, 2, 3];
    const weights = [1, 2];

    const throwingFn = () => assertValidCumulativeWeights(weights, items.length);

    expect(throwingFn).toThrowError(new Error('The number of weights must match the number of items.'));
  });

  it('if the weights array is empty, throws an error', () => {
    const throwingFn = () => assertValidCumulativeWeights([]);

    expect(throwingFn).toThrowError(new Error('Cannot pick an item from an empty array.'));
  });

  it('if the weights array has a negative weight, throws an error', () => {
    const badWeights = [1, -1];

    const throwingFn = () => assertValidCumulativeWeights(badWeights);

    expect(throwingFn).toThrowError(new Error('Weights cannot be negative.'));
  });

  it('if the weights are not ascending, throws an error', () => {
    const badWeights = [1, 2, 1];

    const throwingFn = () => assertValidCumulativeWeights(badWeights);

    expect(throwingFn).toThrowError(new Error('Cumulative weights must be in ascending order.'));
  });
});
