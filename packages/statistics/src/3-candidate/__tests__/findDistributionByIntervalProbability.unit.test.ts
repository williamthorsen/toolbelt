import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { describe, expect, it } from 'vitest';

import { computeNormalIntervalProbabilities } from '../computeNormalIntervalProbabilities.ts';
import { findDistributionByIntervalProbability } from '../findDistributionByIntervalProbability.ts';

describe(findDistributionByIntervalProbability, () => {
  const tolerance = 0.001;

  // Expected standard deviations computed from exact normal-distribution math.
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
      expect(Math.abs(getItemAtIndexOrThrow(intervalProbabilities.additive, 0) / probability - 1)).toBeLessThan(0.0001);
      expect(intervalProbabilities).toStrictEqual(
        computeNormalIntervalProbabilities({ nIntervals, standardDeviation }),
      );
    },
  );

  it('reports the divergence from the target on a converged result', () => {
    const { divergenceFromTarget } = findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.05 });

    expect(Math.abs(divergenceFromTarget)).toBeLessThan(0.0001);
  });

  it('honors a halfWidth that widens the window', () => {
    // Only the ratio of halfWidth to the standard deviation matters, so doubling the window doubles
    // the standard deviation that yields the same target.
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

  it.each([
    {
      label: 'the target exceeds the probability reachable at the top of the range',
      params: { nIntervals: 5, probability: 0.1995 },
      options: {},
      errorClass: RangeError,
      fragment: 'maximum reachable',
    },
    {
      label: 'the target falls below the probability reachable at the bottom of the range',
      params: { nIntervals: 5, probability: 0.01 },
      options: { minStandardDeviation: 2 },
      errorClass: RangeError,
      fragment: 'minimum reachable',
    },
    {
      label: 'the target is unreachable because the interval count fixes the probability',
      params: { nIntervals: 2, probability: 0.4 },
      options: {},
      errorClass: RangeError,
      fragment: 'minimum reachable',
    },
    {
      label: 'maxStandardDeviation is not greater than minStandardDeviation',
      params: { nIntervals: 5, probability: 0.1 },
      options: { minStandardDeviation: 1, maxStandardDeviation: 0.5 },
      errorClass: RangeError,
      fragment: 'greater than minStandardDeviation',
    },
    {
      label: 'minStandardDeviation is 0',
      params: { nIntervals: 5, probability: 0.1 },
      options: { minStandardDeviation: 0 },
      errorClass: RangeError,
      fragment: 'greater than 0',
    },
    {
      label: 'the probability is 0',
      params: { nIntervals: 5, probability: 0 },
      options: {},
      errorClass: RangeError,
      fragment: 'greater than 0',
    },
    {
      label: 'the tolerance is 0',
      params: { nIntervals: 5, probability: 0.05 },
      options: { tolerance: 0 },
      errorClass: RangeError,
      fragment: 'tolerance',
    },
    {
      label: 'the tolerance is negative',
      params: { nIntervals: 5, probability: 0.05 },
      options: { tolerance: -0.001 },
      errorClass: RangeError,
      fragment: 'tolerance',
    },
    {
      label: 'the tolerance is NaN',
      params: { nIntervals: 5, probability: 0.05 },
      options: { tolerance: NaN },
      errorClass: TypeError,
      fragment: 'tolerance',
    },
    {
      label: 'nIntervals is not an integer',
      params: { nIntervals: 1.5, probability: 0.05 },
      options: {},
      errorClass: TypeError,
      fragment: 'nIntervals',
    },
    {
      label: 'nIntervals is 0',
      params: { nIntervals: 0, probability: 0.05 },
      options: {},
      errorClass: RangeError,
      fragment: 'nIntervals',
    },
    {
      label: 'maxIterations is not an integer',
      params: { nIntervals: 5, probability: 0.05 },
      options: { maxIterations: 1.5 },
      errorClass: TypeError,
      fragment: 'maxIterations',
    },
    {
      label: 'maxIterations is 0',
      params: { nIntervals: 5, probability: 0.05 },
      options: { maxIterations: 0 },
      errorClass: RangeError,
      fragment: 'maxIterations',
    },
    ...[Infinity, -Infinity, NaN].flatMap((nonFinite) => [
      {
        label: `the probability is ${nonFinite}`,
        params: { nIntervals: 5, probability: nonFinite },
        options: {},
        errorClass: TypeError,
        fragment: 'probability',
      },
      {
        label: `minStandardDeviation is ${nonFinite}`,
        params: { nIntervals: 5, probability: 0.05 },
        options: { minStandardDeviation: nonFinite },
        errorClass: TypeError,
        fragment: 'minStandardDeviation',
      },
      {
        label: `maxStandardDeviation is ${nonFinite}`,
        params: { nIntervals: 5, probability: 0.05 },
        options: { maxStandardDeviation: nonFinite },
        errorClass: TypeError,
        fragment: 'maxStandardDeviation',
      },
    ]),
  ])('throws if $label', ({ errorClass, fragment, options, params }) => {
    expect(() => findDistributionByIntervalProbability(params, options)).toThrow(errorClass);
    expect(() => findDistributionByIntervalProbability(params, options)).toThrow(fragment);
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
