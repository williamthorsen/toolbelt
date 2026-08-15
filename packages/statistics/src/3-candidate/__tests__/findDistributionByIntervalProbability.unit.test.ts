import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { describe, expect, it } from 'vitest';

import { computeNormalIntervalProbabilities } from '../computeNormalIntervalProbabilities.ts';
import { findDistributionByIntervalProbability } from '../findDistributionByIntervalProbability.ts';

describe(findDistributionByIntervalProbability, () => {
  const tolerance = 0.001;

  // Expected standard deviations computed from exact normal-distribution math, independent of the
  // CDF approximation under test.
  const useCases = [
    { nIntervals: 3, probability: 0.05, expectedSd: 0.607_958_1 },
    { nIntervals: 5, probability: 0.001, expectedSd: 0.582_487_7 },
    { nIntervals: 5, probability: 0.01, expectedSd: 0.774_398_8 },
    { nIntervals: 5, probability: 0.05, expectedSd: 1.114_879_9 },
    { nIntervals: 5, probability: 0.1, expectedSd: 1.532_760_7 },
    { nIntervals: 10, probability: 0.01, expectedSd: 1.070_557_3 },
  ];

  it.each(useCases)(
    'finds a normal distribution for $probability in the first of $nIntervals intervals',
    ({ nIntervals, probability, expectedSd }) => {
      const { converged, intervalProbabilities, standardDeviation } = findDistributionByIntervalProbability({
        nIntervals,
        probability,
      });

      expect(converged).toBe(true);
      expect(Math.abs(standardDeviation - expectedSd)).toBeLessThan(tolerance);
      expect(Math.abs(getItemAtIndexOrThrow(intervalProbabilities.additive, 0) / probability - 1)).toBeLessThan(
        0.000_1,
      );
      expect(intervalProbabilities).toStrictEqual(
        computeNormalIntervalProbabilities({ nIntervals, standardDeviation }),
      );
    },
  );

  it('reports the divergence from the target on a converged result', () => {
    const { divergenceFromTarget } = findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.05 });

    expect(Math.abs(divergenceFromTarget)).toBeLessThan(0.000_1);
  });

  it('honors a halfWidth that widens the window', () => {
    // Only the ratio of halfWidth to the standard deviation matters, so doubling the window doubles
    // the standard deviation that reaches the same target.
    const { standardDeviation } = findDistributionByIntervalProbability({
      halfWidth: 6,
      nIntervals: 5,
      probability: 0.05,
    });

    expect(Math.abs(standardDeviation - 2 * 1.114_879_9)).toBeLessThan(tolerance);
  });

  it('reports non-convergence instead of throwing when the iteration cap is reached', () => {
    const result = findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.001 }, { maxIterations: 2 });

    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(2);
  });

  it('converges on the first step when every standard deviation yields the target', () => {
    const { converged, intervalProbabilities, iterations } = findDistributionByIntervalProbability({
      nIntervals: 1,
      probability: 1,
    });

    expect(converged).toBe(true);
    expect(iterations).toBe(1);
    expect(intervalProbabilities.additive).toStrictEqual([1]);
  });

  it('throws an error if the target exceeds the probability reachable at the top of the range', () => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.199_5 });

    expect(throwingFn).toThrow('is above the maximum reachable');
    expect(throwingFn).toThrow('standard deviation in range [0.01, 20]');
  });

  it('throws an error if the target falls below the probability reachable at the bottom of the range', () => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.01 }, { sdMin: 2 });

    expect(throwingFn).toThrow('is below the minimum reachable');
    expect(throwingFn).toThrow('standard deviation in range [2, 20]');
  });

  it('throws an error if the target is unreachable because the interval count fixes the probability', () => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 2, probability: 0.4 });

    expect(throwingFn).toThrow('is below the minimum reachable');
  });

  it('throws an error if given a bad standard-deviation range', () => {
    const throwingFn = () =>
      findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.1 }, { sdMin: 1, sdMax: 0.5 });

    expect(throwingFn).toThrow('Maximum standard deviation (sdMax) must be greater than minimum (sdMin).');
  });

  it('throws an error if the minimum standard deviation is not greater than 0', () => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.1 }, { sdMin: 0 });

    expect(throwingFn).toThrow('Minimum standard deviation (sdMin) must be greater than 0.');
  });

  it('throws an error if the probability is not greater than 0', () => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 5, probability: 0 });

    expect(throwingFn).toThrow('Probability must be greater than 0.');
  });

  it.each([Infinity, -Infinity, NaN])('throws an error if the probability is %p', (probability) => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 5, probability });

    expect(throwingFn).toThrow('probability must be a finite number.');
  });

  it.each([Infinity, -Infinity, NaN])('throws an error if sdMin is %p', (sdMin) => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.05 }, { sdMin });

    expect(throwingFn).toThrow('sdMin must be a finite number.');
  });

  it.each([Infinity, -Infinity, NaN])('throws an error if sdMax is %p', (sdMax) => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.05 }, { sdMax });

    expect(throwingFn).toThrow('sdMax must be a finite number.');
  });

  it('throws an error if the tolerance is not a finite number', () => {
    const throwingFn = () =>
      findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.05 }, { tolerance: NaN });

    expect(throwingFn).toThrow('tolerance must be a finite number.');
  });

  it('evaluates the returned distribution once, so it matches the reported divergence', () => {
    const { divergenceFromTarget, intervalProbabilities, standardDeviation } = findDistributionByIntervalProbability({
      nIntervals: 5,
      probability: 0.05,
    });

    expect(getItemAtIndexOrThrow(intervalProbabilities.additive, 0) / 0.05 - 1).toBeCloseTo(divergenceFromTarget, 15);
    expect(intervalProbabilities).toStrictEqual(
      computeNormalIntervalProbabilities({ nIntervals: 5, standardDeviation }),
    );
  });
});
