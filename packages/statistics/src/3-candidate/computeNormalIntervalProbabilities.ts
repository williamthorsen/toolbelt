import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

import { assertFinite } from '../internal/assertFinite.ts';
import { assertPositiveInteger } from '../internal/assertPositiveInteger.ts';
import { computeCdf } from './computeCdf.ts';
import { toCumulativeSumsFromAddends } from './toCumulativeSumsFromAddends.ts';

/**
 * Returns the additive & cumulative probabilities that a normal distribution places in each of
 * `nIntervals` equal intervals spanning `mean ± halfWidth`. Mass falling outside that window is
 * excluded, so the probabilities describe the truncated distribution and sum to 1.
 *
 * The window is fixed independently of the standard deviation: a small standard deviation
 * concentrates mass in the middle intervals, and a large one spreads it toward uniformity.
 *
 * @category Statistics
 * @stage candidate
 */
export function computeNormalIntervalProbabilities(params: Params): IntervalProbabilities {
  const { halfWidth = 3, mean = 0, nIntervals, standardDeviation = 1 } = params;

  assertPositiveInteger(nIntervals, 'nIntervals');
  assertFinite(halfWidth, 'halfWidth');
  assertFinite(mean, 'mean');
  assertFinite(standardDeviation, 'standardDeviation');

  if (halfWidth <= 0) {
    throw new Error('halfWidth must be greater than 0.');
  }
  if (standardDeviation < 0) {
    throw new Error('Standard deviation cannot be negative.');
  }

  const additive =
    standardDeviation === 0
      ? toPointMassProbabilities(nIntervals)
      : toNormalProbabilities({ halfWidth, mean, nIntervals, standardDeviation });

  return { additive, cumulative: toCumulativeSumsFromAddends(additive) };
}

function sum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

/**
 * Returns the share of the distribution's in-window mass falling in each interval.
 */
function toNormalProbabilities(params: WindowParams): number[] {
  const { halfWidth, mean, nIntervals, standardDeviation } = params;

  // Space the interval boundaries evenly across the window.
  const boundaries = Array.from(
    { length: nIntervals + 1 },
    (_, i) => mean - halfWidth + (2 * halfWidth * i) / nIntervals,
  );

  const cumulativeWeights = boundaries.map((value) => computeCdf({ mean, standardDeviation, value }));

  const weights: number[] = [];
  for (let i = 1; i < cumulativeWeights.length; i++) {
    weights.push(getItemAtIndexOrThrow(cumulativeWeights, i) - getItemAtIndexOrThrow(cumulativeWeights, i - 1));
  }

  return toProbabilitiesFromWeights(weights);
}

/**
 * Returns the limiting probabilities as the standard deviation approaches 0: all mass sits at the
 * mean, which falls inside the middle interval when their count is odd and on the boundary between
 * the two central intervals when it is even.
 */
function toPointMassProbabilities(nIntervals: number): number[] {
  if (nIntervals % 2 === 1) {
    const middleIndex = (nIntervals - 1) / 2;
    return Array.from({ length: nIntervals }, (_, i) => (i === middleIndex ? 1 : 0));
  }

  const lowerMiddleIndex = nIntervals / 2 - 1;
  return Array.from({ length: nIntervals }, (_, i) => (i === lowerMiddleIndex || i === lowerMiddleIndex + 1 ? 0.5 : 0));
}

function toProbabilitiesFromWeights(weights: number[]): number[] {
  const total = sum(weights);
  return weights.map((weight) => weight / total);
}

interface Params {
  halfWidth?: number | undefined;
  mean?: number | undefined;
  nIntervals: number;
  standardDeviation?: number | undefined;
}

interface WindowParams {
  halfWidth: number;
  mean: number;
  nIntervals: number;
  standardDeviation: number;
}

interface IntervalProbabilities {
  additive: number[];
  cumulative: number[];
}
