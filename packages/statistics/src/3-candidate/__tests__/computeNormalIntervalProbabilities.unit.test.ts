import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { describe, expect, it } from 'vitest';

import { computeNormalIntervalProbabilities } from '../computeNormalIntervalProbabilities.ts';

// Expectations computed from exact normal-distribution math, independent of the CDF approximation
// under test, which carries ~7.5e-8 of absolute error.
const PRECISION = 6;

describe(computeNormalIntervalProbabilities, () => {
  it('returns a symmetrical array of probabilities when nIntervals is odd', () => {
    const { additive } = computeNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 5 });

    expect(getAtIndexOrThrow(additive, 0)).toBeCloseTo(getAtIndexOrThrow(additive, 4), 4);
    expect(getAtIndexOrThrow(additive, 1)).toBeCloseTo(getAtIndexOrThrow(additive, 3), 4);
  });

  it('returns a symmetrical array of probabilities when nIntervals is even', () => {
    const { additive } = computeNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 4 });

    expect(getAtIndexOrThrow(additive, 0)).toBeCloseTo(getAtIndexOrThrow(additive, 3), 4);
    expect(getAtIndexOrThrow(additive, 1)).toBeCloseTo(getAtIndexOrThrow(additive, 2), 4);
  });

  it('returns a cumulative probability of approximately 1', () => {
    const nIntervals = 2;
    const { additive, cumulative } = computeNormalIntervalProbabilities({
      mean: 0,
      standardDeviation: 0.896_8,
      nIntervals,
    });

    expect(getAtIndexOrThrow(cumulative, nIntervals - 1)).toBeCloseTo(1, 4);
    expect(sum(additive)).toBeCloseTo(1, 4);
  });

  it('returns additive & cumulative probabilities of [1] when nIntervals is 1', () => {
    const { additive, cumulative } = computeNormalIntervalProbabilities({
      mean: 0,
      standardDeviation: 1,
      nIntervals: 1,
    });

    expect(getAtIndexOrThrow(additive, 0)).toBeCloseTo(1, 4);
    expect(getAtIndexOrThrow(cumulative, 0)).toBeCloseTo(1, 4);
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

  it('throws an error if nIntervals is not an integer', () => {
    const throwingFn = () => computeNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 1.5 });

    expect(throwingFn).toThrow('nIntervals must be a safe integer.');
  });

  it('throws an error if nIntervals exceeds safe-integer precision', () => {
    const throwingFn = () =>
      computeNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 2 ** 53 + 2 });

    expect(throwingFn).toThrow('nIntervals must be a safe integer.');
  });

  it('throws an error if nIntervals is less than 1', () => {
    const throwingFn = () => computeNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 0 });

    expect(throwingFn).toThrow('nIntervals must be greater than 0.');
  });

  it('throws an error if halfWidth is not greater than 0', () => {
    const throwingFn = () => computeNormalIntervalProbabilities({ halfWidth: 0, nIntervals: 5 });

    expect(throwingFn).toThrow('halfWidth must be greater than 0.');
  });

  it('throws an error if the standard deviation is negative', () => {
    const throwingFn = () => computeNormalIntervalProbabilities({ nIntervals: 5, standardDeviation: -1 });

    expect(throwingFn).toThrow('Standard deviation cannot be negative.');
  });

  it.each([Infinity, -Infinity, NaN])('throws an error if the standard deviation is %p', (standardDeviation) => {
    const throwingFn = () => computeNormalIntervalProbabilities({ nIntervals: 5, standardDeviation });

    expect(throwingFn).toThrow('standardDeviation must be a finite number.');
  });

  it.each([Infinity, -Infinity, NaN])('throws an error if halfWidth is %p', (halfWidth) => {
    const throwingFn = () => computeNormalIntervalProbabilities({ halfWidth, nIntervals: 5 });

    expect(throwingFn).toThrow('halfWidth must be a finite number.');
  });

  it.each([Infinity, -Infinity, NaN])('throws an error if the mean is %p', (mean) => {
    const throwingFn = () => computeNormalIntervalProbabilities({ mean, nIntervals: 5 });

    expect(throwingFn).toThrow('mean must be a finite number.');
  });
});

/**
 * Returns a matcher per value, so an array comparison tolerates the CDF approximation's error.
 */
function buildCloseMatchers(values: number[]): unknown[] {
  return values.map((value): unknown => expect.closeTo(value, PRECISION));
}

function sum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}
