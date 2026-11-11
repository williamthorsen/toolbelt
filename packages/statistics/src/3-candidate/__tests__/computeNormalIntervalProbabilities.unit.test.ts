import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { describe, expect, it } from 'vitest';

import { buildNotFiniteError } from '../../test-utils/buildNotFiniteError.ts';
import { computeNormalIntervalProbabilities } from '../computeNormalIntervalProbabilities.ts';

// The listed expectations are exact normal-distribution values rounded to 10 decimal places; 9 digits of tolerance
// (an absolute error below 5e-10) covers that rounding.
const PRECISION = 9;

describe(computeNormalIntervalProbabilities, () => {
  it('returns a symmetrical array of probabilities when nIntervals is odd', () => {
    const { additive } = computeNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 5 });

    expect(getItemAtIndexOrThrow(additive, 0)).toBeCloseTo(getItemAtIndexOrThrow(additive, 4), PRECISION);
    expect(getItemAtIndexOrThrow(additive, 1)).toBeCloseTo(getItemAtIndexOrThrow(additive, 3), PRECISION);
  });

  it('returns a symmetrical array of probabilities when nIntervals is even', () => {
    const { additive } = computeNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 4 });

    expect(getItemAtIndexOrThrow(additive, 0)).toBeCloseTo(getItemAtIndexOrThrow(additive, 3), PRECISION);
    expect(getItemAtIndexOrThrow(additive, 1)).toBeCloseTo(getItemAtIndexOrThrow(additive, 2), PRECISION);
  });

  it('returns a cumulative probability of approximately 1', () => {
    const nIntervals = 2;
    const { additive, cumulative } = computeNormalIntervalProbabilities({
      mean: 0,
      standardDeviation: 0.8968,
      nIntervals,
    });

    expect(getItemAtIndexOrThrow(cumulative, nIntervals - 1)).toBeCloseTo(1, PRECISION);
    expect(sum(additive)).toBeCloseTo(1, PRECISION);
  });

  it('returns additive & cumulative probabilities of [1] when nIntervals is 1', () => {
    const { additive, cumulative } = computeNormalIntervalProbabilities({
      mean: 0,
      standardDeviation: 1,
      nIntervals: 1,
    });

    expect(getItemAtIndexOrThrow(additive, 0)).toBeCloseTo(1, PRECISION);
    expect(getItemAtIndexOrThrow(cumulative, 0)).toBeCloseTo(1, PRECISION);
  });

  it('returns the expected probabilities for a unit standard deviation', () => {
    const { additive } = computeNormalIntervalProbabilities({ nIntervals: 5, standardDeviation: 1 });

    expect(additive).toStrictEqual(
      buildCloseMatchers([0.034_674_033_9, 0.238_967_963_4, 0.452_716_005_4, 0.238_967_963_4, 0.034_674_033_9]),
    );
  });

  it('spreads mass toward the outer intervals as the standard deviation grows', () => {
    const { additive } = computeNormalIntervalProbabilities({ nIntervals: 5, standardDeviation: 2 });

    expect(additive).toStrictEqual(
      buildCloseMatchers([0.135_335_726_3, 0.228_568_495_4, 0.272_191_556_6, 0.228_568_495_4, 0.135_335_726_3]),
    );
  });

  it('concentrates mass in the middle intervals as the standard deviation shrinks', () => {
    const { additive } = computeNormalIntervalProbabilities({ nIntervals: 5, standardDeviation: 0.5 });

    expect(additive).toStrictEqual(
      buildCloseMatchers([0.000_159_107_6, 0.114_910_561_9, 0.769_860_661_1, 0.114_910_561_9, 0.000_159_107_6]),
    );
  });

  it('returns the expected probabilities for an even interval count', () => {
    const { additive } = computeNormalIntervalProbabilities({ nIntervals: 4, standardDeviation: 1 });

    expect(additive).toStrictEqual(buildCloseMatchers([0.065_634_503, 0.434_365_497, 0.434_365_497, 0.065_634_503]));
  });

  it('depends only on the ratio of halfWidth to the standard deviation', () => {
    const scaled = computeNormalIntervalProbabilities({ halfWidth: 6, nIntervals: 5, standardDeviation: 2 });
    const unscaled = computeNormalIntervalProbabilities({ halfWidth: 3, nIntervals: 5, standardDeviation: 1 });

    expect(scaled.additive).toStrictEqual(buildCloseMatchers(unscaled.additive));
  });

  it('is unaffected by the mean, which shifts the window with the distribution', () => {
    const shifted = computeNormalIntervalProbabilities({ mean: 100, nIntervals: 5, standardDeviation: 2 });
    const centered = computeNormalIntervalProbabilities({ mean: 0, nIntervals: 5, standardDeviation: 2 });

    expect(shifted.additive).toStrictEqual(buildCloseMatchers(centered.additive));
  });

  it('places all mass in the middle interval when the standard deviation is 0 and nIntervals is odd', () => {
    const { additive, cumulative } = computeNormalIntervalProbabilities({ nIntervals: 5, standardDeviation: 0 });

    expect(additive).toStrictEqual([0, 0, 1, 0, 0]);
    expect(cumulative).toStrictEqual([0, 0, 1, 1, 1]);
  });

  it('splits mass across the two central intervals when the standard deviation is 0 and nIntervals is even', () => {
    const { additive } = computeNormalIntervalProbabilities({ nIntervals: 4, standardDeviation: 0 });

    expect(additive).toStrictEqual([0, 0.5, 0.5, 0]);
  });

  it('returns [1] when the standard deviation is 0 and nIntervals is 1', () => {
    const { additive } = computeNormalIntervalProbabilities({ nIntervals: 1, standardDeviation: 0 });

    expect(additive).toStrictEqual([1]);
  });

  it.each([
    {
      label: 'nIntervals is not an integer',
      params: { nIntervals: 1.5 },
      error: new TypeError('nIntervals must be a safe integer.'),
    },
    {
      label: 'nIntervals exceeds safe-integer precision',
      params: { nIntervals: 2 ** 53 + 2 },
      error: new TypeError('nIntervals must be a safe integer.'),
    },
    {
      label: 'nIntervals is 0',
      params: { nIntervals: 0 },
      error: new RangeError('nIntervals must be greater than 0.'),
    },
    {
      label: 'halfWidth is 0',
      params: { halfWidth: 0, nIntervals: 5 },
      error: new RangeError('halfWidth must be greater than 0.'),
    },
    {
      label: 'the standard deviation is negative',
      params: { nIntervals: 5, standardDeviation: -1 },
      error: new RangeError('standardDeviation must not be negative.'),
    },
    ...[Infinity, -Infinity, NaN].flatMap((nonFinite) => [
      {
        label: `the standard deviation is ${nonFinite}`,
        params: { nIntervals: 5, standardDeviation: nonFinite },
        error: buildNotFiniteError('standardDeviation'),
      },
      {
        label: `halfWidth is ${nonFinite}`,
        params: { halfWidth: nonFinite, nIntervals: 5 },
        error: buildNotFiniteError('halfWidth'),
      },
      {
        label: `the mean is ${nonFinite}`,
        params: { mean: nonFinite, nIntervals: 5 },
        error: buildNotFiniteError('mean'),
      },
    ]),
  ])('throws if $label', ({ error, params }) => {
    expect(() => computeNormalIntervalProbabilities(params)).toThrow(error);
  });
});

// region | Helpers

/**
 * Returns a matcher per value, so that an array comparison tolerates rounding.
 */
function buildCloseMatchers(values: number[]): unknown[] {
  return values.map((value): unknown => expect.closeTo(value, PRECISION));
}

/** Returns the total of the values. */
function sum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

// endregion | Helpers
