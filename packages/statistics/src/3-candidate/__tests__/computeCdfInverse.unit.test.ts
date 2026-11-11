import { describe, expect, it } from 'vitest';

import { buildNotFiniteError } from '../../test-utils/buildNotFiniteError.ts';
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

  it('uses the standard normal distribution when called without options', () => {
    expect(computeCdfInverse(0.9)).toBeCloseTo(lastDecile, 4);
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

  // Reference quantile from mpmath at 60 significant digits, rounded to the nearest double.
  it('returns the quantile of the probability 1 - 1e-12 to a relative error of 1e-15', () => {
    const quantile = computeCdfInverse(1 - 1e-12, {});

    expect(Math.abs(quantile / 7.034_486_910_047_835_6 - 1)).toBeLessThan(1e-15);
  });

  it.each([
    {
      label: 'the probability is Infinity',
      probability: Infinity,
      options: {},
      error: buildNotFiniteError('probability'),
    },
    {
      label: 'the probability is -Infinity',
      probability: -Infinity,
      options: {},
      error: buildNotFiniteError('probability'),
    },
    { label: 'the probability is NaN', probability: NaN, options: {}, error: buildNotFiniteError('probability') },
    {
      label: 'the probability is below 0',
      probability: -0.5,
      options: {},
      error: new RangeError('probability must be in the range [0, 1].'),
    },
    {
      label: 'the probability is above 1',
      probability: 1.5,
      options: {},
      error: new RangeError('probability must be in the range [0, 1].'),
    },
    {
      label: 'the mean is Infinity',
      probability: 0.5,
      options: { mean: Infinity },
      error: buildNotFiniteError('mean'),
    },
    {
      label: 'the mean is -Infinity',
      probability: 0.5,
      options: { mean: -Infinity },
      error: buildNotFiniteError('mean'),
    },
    { label: 'the mean is NaN', probability: 0.5, options: { mean: NaN }, error: buildNotFiniteError('mean') },
    {
      label: 'the standard deviation is Infinity',
      probability: 0.5,
      options: { standardDeviation: Infinity },
      error: buildNotFiniteError('standardDeviation'),
    },
    {
      label: 'the standard deviation is -Infinity',
      probability: 0.5,
      options: { standardDeviation: -Infinity },
      error: buildNotFiniteError('standardDeviation'),
    },
    {
      label: 'the standard deviation is NaN',
      probability: 0.5,
      options: { standardDeviation: NaN },
      error: buildNotFiniteError('standardDeviation'),
    },
    {
      label: 'the standard deviation is 0',
      probability: 0.5,
      options: { standardDeviation: 0 },
      error: new RangeError('Standard deviation must be greater than zero.'),
    },
    {
      label: 'the standard deviation is negative',
      probability: 0.5,
      options: { standardDeviation: -1 },
      error: new RangeError('Standard deviation must be greater than zero.'),
    },
  ])('throws if $label', ({ error, options, probability }) => {
    expect(() => computeCdfInverse(probability, options)).toThrow(error);
  });
});
