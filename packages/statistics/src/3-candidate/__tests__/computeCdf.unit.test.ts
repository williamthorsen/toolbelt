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

  it('uses the standard deviation as the variance, so sigma is its square root', () => {
    // variance 4 => sigma 2, so value 2 is one sigma above the mean: Phi(1) ~ 0.8413447
    expect(computeCdf({ mean: 0, standardDeviation: 4, value: 2 })).toBeCloseTo(0.841_344_7, 4);
  });

  it('throws an error if given an invalid standard deviation', () => {
    const throwingFn = () => computeCdf({ mean: 0, standardDeviation: 0, value: 0 });

    expect(throwingFn).toThrow('Standard deviation must be greater than zero.');
  });
});
