import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { describe, expect, it } from 'vitest';

import { findDistributionByIntervalProbability } from '../findDistributionByIntervalProbability.ts';
import { getNormalIntervalProbabilities } from '../getNormalIntervalProbabilities.ts';

describe(findDistributionByIntervalProbability, () => {
  const tolerance = 0.001;

  const useCases = [
    // Ordinary values
    { nIntervals: 5, probability: 0.001, expectedSd: 1.432 },
    { nIntervals: 5, probability: 0.01, expectedSd: 1.186 },
    { nIntervals: 5, probability: 0.05, expectedSd: 0.93 },
    { nIntervals: 5, probability: 0.1, expectedSd: 0.753 },
    // Extreme minimums
    { nIntervals: 1, probability: 1, expectedSd: 0 },
    { nIntervals: 5, probability: 0.000_000_1, expectedSd: 3 },
    { nIntervals: 10, probability: 0.000_001, expectedSd: 3 },
  ];

  it.each(useCases)(
    'finds a normal distribution for $probability in the first of $nIntervals intervals',
    ({ nIntervals, probability, expectedSd }) => {
      const { intervalProbabilities, standardDeviation } = findDistributionByIntervalProbability({
        nIntervals,
        probability,
      });

      expect(Math.abs(standardDeviation - expectedSd)).toBeLessThan(tolerance);
      expect(Math.abs(getAtIndexOrThrow(intervalProbabilities.additive, 0) - probability)).toBeLessThan(tolerance);
      expect(intervalProbabilities).toStrictEqual(getNormalIntervalProbabilities({ nIntervals, standardDeviation }));
    },
  );

  it('returns uniform probabilities when the probability is within tolerance of the uniform probability', () => {
    const nIntervals = 5;

    const actual = findDistributionByIntervalProbability({ nIntervals, probability: 0.199_995 }).intervalProbabilities
      .additive;

    expect(actual).toStrictEqual([0.2, 0.2, 0.2, 0.2, 0.2]);
    expect(actual).toStrictEqual(getNormalIntervalProbabilities({ nIntervals, standardDeviation: 0 }).additive);
  });

  it('throws an error if a matching distribution cannot be found', () => {
    const throwingFn = () => findDistributionByIntervalProbability({ nIntervals: 3, probability: 0.4 });

    expect(throwingFn).toThrow('Probability cannot be greater than a uniform probability');
  });

  it('throws an error if given a bad standard-deviation range', () => {
    const throwingFn = () =>
      findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.1, sdMin: 1, sdMax: 0.5 });

    expect(throwingFn).toThrow('Maximum standard deviation (sdMax) must be greater than minimum (sdMin).');
  });

  it('throws an error if the standard-deviation range does not include the requested probability', () => {
    const throwingFn = () =>
      findDistributionByIntervalProbability({ nIntervals: 5, probability: 0.1, sdMin: 0.4, sdMax: 0.5 });

    expect(throwingFn).toThrow('Cannot find requested probability with standard deviation in range [0.4, 0.5]');
  });
});
