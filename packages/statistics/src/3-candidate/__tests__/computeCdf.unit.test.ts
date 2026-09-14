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

  // Reference probabilities from mpmath's `ncdf` at 40 significant digits, rounded to the nearest double.
  it.each([
    { value: -30, expected: 4.906_713_927_148_187e-198 },
    { value: -20, expected: 2.753_624_118_606_233_7e-89 },
    { value: -10, expected: 7.619_853_024_160_525e-24 },
    { value: -8, expected: 6.220_960_574_271_784e-16 },
    { value: -5, expected: 2.866_515_718_791_939e-7 },
    { value: -3, expected: 0.001_349_898_031_630_094_6 },
    { value: -1.5, expected: 0.066_807_201_268_858_07 },
    { value: -1, expected: 0.158_655_253_931_457_05 },
    { value: -0.5, expected: 0.308_537_538_725_986_9 },
  ])('matches the reference probability at $value to a relative error of 1e-12', ({ expected, value }) => {
    expect(Math.abs(computeCdf({ value }) / expected - 1)).toBeLessThan(1e-12);
  });

  it('returns a positive probability 38 standard deviations below the mean', () => {
    expect(computeCdf({ value: -38 })).toBeGreaterThan(0);
  });

  it('throws an error if given an invalid standard deviation', () => {
    const throwingFn = () => computeCdf({ mean: 0, standardDeviation: 0, value: 0 });

    expect(throwingFn).toThrow('Standard deviation must be greater than zero.');
  });
});
