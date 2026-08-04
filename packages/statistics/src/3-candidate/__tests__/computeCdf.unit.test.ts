import { describe, expect, it } from 'vitest';

import { computeCdf } from '../computeCdf.ts';

describe(computeCdf, () => {
  it('returns a number very close to 0.5 for a standard normal distribution', () => {
    expect(computeCdf({ mean: 0, standardDeviation: 1, value: 0 })).toBeCloseTo(0.5, 4);
  });

  it('returns a number very close to zero for a large negative value', () => {
    expect(computeCdf({ mean: 0, standardDeviation: 1, value: -10_000 })).toBeCloseTo(0, 4);
  });

  it('returns a number very close to 1 for a large positive value', () => {
    expect(computeCdf({ mean: 0, standardDeviation: 1, value: 10_000 })).toBeCloseTo(1, 4);
  });

  it('treats the standard deviation as sigma rather than the variance', () => {
    // Value 2 is one sigma above the mean: Phi(1).
    expect(computeCdf({ mean: 0, standardDeviation: 2, value: 2 })).toBeCloseTo(0.841_344_746_069, 6);
  });

  it('scales a non-unit standard deviation about a non-zero mean', () => {
    // Value 7 is two sigma above the mean: Phi(2).
    expect(computeCdf({ mean: 1, standardDeviation: 3, value: 7 })).toBeCloseTo(0.977_249_868_052, 6);
  });

  it('throws an error if given an invalid standard deviation', () => {
    const throwingFn = () => computeCdf({ mean: 0, standardDeviation: 0, value: 0 });

    expect(throwingFn).toThrow('Standard deviation must be greater than zero.');
  });
});
