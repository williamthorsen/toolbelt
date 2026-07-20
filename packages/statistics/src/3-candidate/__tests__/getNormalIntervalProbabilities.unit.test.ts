import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { describe, expect, it } from 'vitest';

import { getNormalIntervalProbabilities } from '../getNormalIntervalProbabilities.ts';

describe(getNormalIntervalProbabilities, () => {
  it('returns a symmetrical array of probabilities when nIntervals is odd', () => {
    const { additive } = getNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 5 });

    expect(getAtIndexOrThrow(additive, 0)).toBeCloseTo(getAtIndexOrThrow(additive, 4), 4);
    expect(getAtIndexOrThrow(additive, 1)).toBeCloseTo(getAtIndexOrThrow(additive, 3), 4);
  });

  it('returns a symmetrical array of probabilities when nIntervals is even', () => {
    const { additive } = getNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 4 });

    expect(getAtIndexOrThrow(additive, 0)).toBeCloseTo(getAtIndexOrThrow(additive, 3), 4);
    expect(getAtIndexOrThrow(additive, 1)).toBeCloseTo(getAtIndexOrThrow(additive, 2), 4);
  });

  it('returns a cumulative probability of approximately 1', () => {
    const nIntervals = 2;
    const { additive, cumulative } = getNormalIntervalProbabilities({ mean: 0, standardDeviation: 0.8968, nIntervals });

    expect(getAtIndexOrThrow(cumulative, nIntervals - 1)).toBeCloseTo(1, 4);
    expect(sum(additive)).toBeCloseTo(1, 4);
  });

  it('returns additive & cumulative probabilities of [1] when nIntervals is 1', () => {
    const { additive, cumulative } = getNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 1 });

    expect(getAtIndexOrThrow(additive, 0)).toBeCloseTo(1, 4);
    expect(getAtIndexOrThrow(cumulative, 0)).toBeCloseTo(1, 4);
  });

  it('returns uniform probabilities when the standard deviation is 0', () => {
    const { additive } = getNormalIntervalProbabilities({ nIntervals: 4, standardDeviation: 0 });

    expect(additive).toStrictEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it('throws an error if nIntervals is not an integer', () => {
    const throwingFn = () => getNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 1.5 });

    expect(throwingFn).toThrow('nIntervals must be an integer.');
  });

  it('throws an error if nIntervals is less than 1', () => {
    const throwingFn = () => getNormalIntervalProbabilities({ mean: 0, standardDeviation: 1, nIntervals: 0 });

    expect(throwingFn).toThrow('nIntervals must be greater than 0.');
  });
});

function sum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}
