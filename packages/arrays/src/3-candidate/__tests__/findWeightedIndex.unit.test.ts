import { describe, expect, it } from 'vitest';

import { findWeightedIndex } from '../findWeightedIndex.ts';

describe(findWeightedIndex, () => {
  it('returns the correct index based on target weight', () => {
    const cumulativeWeights = [1, 3, 6, 10, 15];
    const targetWeight = 7;
    const expectedIndex = 3;

    const index = findWeightedIndex(cumulativeWeights, targetWeight);

    expect(index).toBe(expectedIndex);
  });

  it('if the target weight is 0, returns the first index', () => {
    const cumulativeWeights = [1, 3, 6, 10, 15];
    const targetWeight = 0;
    const expectedIndex = 0;

    const index = findWeightedIndex(cumulativeWeights, targetWeight);

    expect(index).toBe(expectedIndex);
  });

  it('if the target weight is negative, returns undefined', () => {
    const cumulativeWeights = [1, 3, 6, 10, 15];
    const targetWeight = -1;
    const expectedIndex = undefined;

    const index = findWeightedIndex(cumulativeWeights, targetWeight);

    expect(index).toBe(expectedIndex);
  });

  it('if the input array is empty, returns undefined', () => {
    const cumulativeWeights: number[] = [];
    const targetWeight = 5;
    const expectedIndex = undefined;

    const index = findWeightedIndex(cumulativeWeights, targetWeight);

    expect(index).toBe(expectedIndex);
  });

  it('if the target weight is greater than the highest cumulative weight, returns undefined', () => {
    const cumulativeWeights = [1, 3, 6, 10, 15];
    const targetWeight = 20;
    const expectedIndex = undefined;

    const index = findWeightedIndex(cumulativeWeights, targetWeight);

    expect(index).toBe(expectedIndex);
  });

  it('if the target weight is equal only to the highest cumulative weight, returns the highest index', () => {
    const cumulativeWeights = [1, 3, 6, 10, 15];
    const targetWeight = 15;
    const expectedIndex = 4;

    const index = findWeightedIndex(cumulativeWeights, targetWeight);

    expect(index).toBe(expectedIndex);
  });
});
