import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { round } from '@williamthorsen/toolbelt.numbers/candidate';

import { assertPositiveInteger, getNormalIntervalProbabilities } from './getNormalIntervalProbabilities.ts';

const MAX_ITERATIONS = 50;
const SD_MAX = 20;
const SD_MIN = 0.01;
const TOLERANCE = 0.0001; // probability is accepted when it diverges from the target by no more than this fraction

/**
 * Given a probability and a number of intervals, finds the normal distribution placing the requested
 * probability in its first and last intervals. Bisects the standard-deviation range, across which
 * the first interval's probability increases monotonically.
 */
export function findDistributionByIntervalProbability(params: Params, options: Options = {}): NormalDistribution {
  const { halfWidth, nIntervals, probability: target } = params;
  const { maxIterations = MAX_ITERATIONS, sdMax = SD_MAX, sdMin = SD_MIN, tolerance = TOLERANCE } = options;

  assertPositiveInteger(nIntervals, 'nIntervals');

  if (!(target > 0)) {
    throw new Error('Probability must be greater than 0.');
  }
  if (sdMin <= 0) {
    throw new Error('Minimum standard deviation (sdMin) must be greater than 0.');
  }
  if (sdMin >= sdMax) {
    throw new Error('Maximum standard deviation (sdMax) must be greater than minimum (sdMin).');
  }
  assertPositiveInteger(maxIterations, 'maxIterations');

  const getFirstIntervalProbability = (standardDeviation: number): number =>
    getAtIndexOrThrow(getNormalIntervalProbabilities({ halfWidth, nIntervals, standardDeviation }).additive, 0);

  // Confirm the target lies between the probabilities the range's endpoints can produce.
  const minProbability = getFirstIntervalProbability(sdMin);
  const maxProbability = getFirstIntervalProbability(sdMax);
  const range = `standard deviation in range [${sdMin}, ${sdMax}]`;

  if (target < minProbability) {
    throw new RangeError(
      `Probability ${target} is below the minimum reachable (${round(minProbability, 7)}) with ${range}.`,
    );
  }
  if (target > maxProbability) {
    throw new RangeError(
      `Probability ${target} is above the maximum reachable (${round(maxProbability, 7)}) with ${range}.`,
    );
  }

  let low = sdMin;
  let high = sdMax;
  let standardDeviation = sdMin;
  let probability = minProbability;
  let converged = false;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    standardDeviation = (low + high) / 2;
    probability = getFirstIntervalProbability(standardDeviation);

    if (Math.abs(probability / target - 1) < tolerance) {
      converged = true;
      break;
    }

    if (probability < target) {
      low = standardDeviation;
    } else {
      high = standardDeviation;
    }
  }

  return {
    converged,
    divergenceFromTarget: probability / target - 1,
    intervalProbabilities: getNormalIntervalProbabilities({ halfWidth, nIntervals, standardDeviation }),
    iterations,
    standardDeviation,
  };
}

interface NormalDistribution {
  converged: boolean;
  divergenceFromTarget: number;
  intervalProbabilities: ReturnType<typeof getNormalIntervalProbabilities>;
  iterations: number;
  standardDeviation: number;
}

interface Options {
  maxIterations?: number | undefined;
  sdMax?: number | undefined;
  sdMin?: number | undefined;
  tolerance?: number | undefined;
}

interface Params {
  halfWidth?: number | undefined;
  nIntervals: number;
  probability: number;
}
