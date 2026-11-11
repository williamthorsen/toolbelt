import { assertFinite } from '../internal/assertFinite.ts';
import { assertPositiveInteger } from '../internal/assertPositiveInteger.ts';
import { computeCdf, type NormalDistributionParams } from './computeCdf.ts';
import { toAddendsFromCumulativeSums } from './toAddendsFromCumulativeSums.ts';
import { toCumulativeSumsFromAddends } from './toCumulativeSumsFromAddends.ts';

/**
 * Returns the additive & cumulative probabilities that a normal distribution places in each of
 * `nIntervals` equal intervals spanning `mean ± halfWidth`. Mass falling outside that window is
 * excluded, so the probabilities describe the truncated distribution and sum to 1.
 *
 * The window is fixed independently of the standard deviation: A small standard deviation
 * concentrates mass in the middle intervals, and a large one spreads it toward uniformity.
 *
 * @category Statistics
 * @stage candidate
 */
export function computeNormalIntervalProbabilities(
  params: ComputeNormalIntervalProbabilitiesParams,
): IntervalProbabilities {
  const { halfWidth = 3, mean = 0, nIntervals, standardDeviation = 1 } = params;

  assertPositiveInteger(nIntervals, 'nIntervals');
  assertFinite(halfWidth, 'halfWidth');
  assertFinite(mean, 'mean');
  assertFinite(standardDeviation, 'standardDeviation');

  if (halfWidth <= 0) {
    throw new RangeError('halfWidth must be greater than 0.');
  }
  if (standardDeviation < 0) {
    throw new RangeError('Standard deviation cannot be negative.');
  }

  const additive =
    standardDeviation === 0
      ? toPointMassProbabilities(nIntervals)
      : toNormalProbabilities({ halfWidth, mean, nIntervals, standardDeviation });

  return { additive, cumulative: toCumulativeSumsFromAddends(additive) };
}

// region | Helpers

/** Returns the total of the values. */
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

  // Drop the first addend, which is the CDF at the window's lower boundary.
  const weights = toAddendsFromCumulativeSums(cumulativeWeights).slice(1);

  return toProbabilitiesFromWeights(weights);
}

/**
 * Returns the limiting probabilities as the standard deviation approaches 0: All mass is at the
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

/** Scales the weights so that they sum to 1. */
function toProbabilitiesFromWeights(weights: number[]): number[] {
  const total = sum(weights);
  return weights.map((weight) => weight / total);
}

// endregion | Helpers

/** Parameters of `computeNormalIntervalProbabilities`: the distribution, the window's half-width, and the intervals. */
export interface ComputeNormalIntervalProbabilitiesParams extends NormalDistributionParams {
  halfWidth?: number | undefined;
  nIntervals: number;
}

/** The probability of each interval, and the running total of those probabilities. */
export interface IntervalProbabilities {
  additive: number[];
  cumulative: number[];
}

interface WindowParams {
  halfWidth: number;
  mean: number;
  nIntervals: number;
  standardDeviation: number;
}
