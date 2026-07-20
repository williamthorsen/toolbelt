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

  it('throws an error if given an invalid standard deviation', () => {
    const throwingFn = () => computeCdf({ mean: 0, standardDeviation: 0, value: 0 });

    expect(throwingFn).toThrow('Standard deviation must be greater than zero.');
  });
});
