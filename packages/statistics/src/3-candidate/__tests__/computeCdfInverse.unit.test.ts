import { describe, expect, it } from 'vitest';

import { computeCdf } from '../computeCdf.ts';
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

  it('returns a value close to the known quantile for a small probability in the lower tail', () => {
    expect(computeCdfInverse(0.001, { mean: 0, standardDeviation: 1 })).toBeCloseTo(-3.090_232, 4);
  });

  it('returns a value close to the known quantile for a large probability in the upper tail', () => {
    expect(computeCdfInverse(0.999, { mean: 0, standardDeviation: 1 })).toBeCloseTo(3.090_232, 4);
  });

  it('returns -Infinity for a probability of 0 and Infinity for a probability of 1', () => {
    expect(computeCdfInverse(0, { mean: 0, standardDeviation: 1 })).toBe(-Infinity);
    expect(computeCdfInverse(1, { mean: 0, standardDeviation: 1 })).toBe(Infinity);
  });

  it('treats the standard deviation as sigma rather than the variance', () => {
    // Sigma 2 puts the 0.9 quantile at twice the standard-normal 0.9 quantile.
    expect(computeCdfInverse(0.9, { mean: 0, standardDeviation: 2 })).toBeCloseTo(2 * lastDecile, 4);
  });

  it('round-trips a non-unit standard deviation through computeCdf', () => {
    const options = { mean: 1, standardDeviation: 3 };

    expect(computeCdfInverse(computeCdf({ ...options, value: 7 }), options)).toBeCloseTo(7, 4);
  });

  it.each([-37, -30, -20, -10, -5, -3, -1, 0, 1, 3])(
    'recovers the value %d from its probability to within 1e-13',
    (value) => {
      const roundTrip = computeCdfInverse(computeCdf({ value }), {});

      expect(Math.abs(roundTrip - value)).toBeLessThanOrEqual(1e-13);
    },
  );

  // At 5e-324 the Halley correction overflows and the estimate is returned; at 1e-310 the correction applies.
  it.each([5e-324, 1e-310])('returns a finite quantile below -37 for the subnormal probability %d', (probability) => {
    const quantile = computeCdfInverse(probability, {});

    expect(Number.isFinite(quantile)).toBe(true);
    expect(quantile).toBeLessThan(-37);
  });

  it('throws an error if given an invalid standard deviation', () => {
    const throwingFn = () => computeCdfInverse(0.5, { mean: 0, standardDeviation: 0 });

    expect(throwingFn).toThrow('Standard deviation must be greater than zero.');
  });
});
