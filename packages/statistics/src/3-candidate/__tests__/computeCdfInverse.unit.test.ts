import { describe, expect, it } from 'vitest';

import { computeCdfInverse } from '../computeCdfInverse.ts';

describe(computeCdfInverse, () => {
  const firstDecile = -1.281_551_565_544_600_4;
  const lastDecile = 1.281_551_565_544_600_4;

  it('returns the mean for a probability of 0.5 in a standard normal distribution', () => {
    expect(computeCdfInverse(0.5, { mean: 0, standardDeviation: 1 })).toBeCloseTo(0, 4);
  });

  it('returns a value close to the first decile for a probability of 0.1', () => {
    expect(computeCdfInverse(0.1, { mean: 0, standardDeviation: 1 })).toBeCloseTo(firstDecile, 4);
  });

  it('returns a value close to the last decile for a probability of 0.9', () => {
    expect(computeCdfInverse(0.9, { mean: 0, standardDeviation: 1 })).toBeCloseTo(lastDecile, 4);
  });

  it('throws an error if given an invalid standard deviation', () => {
    const throwingFn = () => computeCdfInverse(0.5, { mean: 0, standardDeviation: 0 });

    expect(throwingFn).toThrow('Standard deviation must be greater than zero.');
  });
});
