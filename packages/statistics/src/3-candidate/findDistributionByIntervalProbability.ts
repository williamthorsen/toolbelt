import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { round } from '@williamthorsen/toolbelt.numbers/candidate';

import { assertFinite } from '../internal/assertFinite.ts';
import { assertPositiveInteger } from '../internal/assertPositiveInteger.ts';
import { getNormalIntervalProbabilities } from './getNormalIntervalProbabilities.ts';

const MAX_ITERATIONS = 50;
const SD_MAX = 20;
const SD_MIN = 0.01;
const TOLERANCE = 0.0001; // probability is accepted when it diverges from the target by no more than this fraction

/**
 * Given a probability and a number of intervals, finds the normal distribution placing the requested
 * probability in its first and last intervals. Bisects the standard-deviation range, across which
 * the first interval's probability increases monotonically.
 *
 * @category Statistics
 * @stage candidate
 */
export function findDistributionByIntervalProbability(params: Params, options: Options = {}): NormalDistribution {
  const { halfWidth, nIntervals, probability: target } = params;
  const { maxIterations = MAX_ITERATIONS, sdMax = SD_MAX, sdMin = SD_MIN, tolerance = TOLERANCE } = options;

  assertPositiveInteger(nIntervals, 'nIntervals');
  assertPositiveInteger(maxIterations, 'maxIterations');
  assertFinite(target, 'probability');
  assertFinite(sdMax, 'sdMax');
  assertFinite(sdMin, 'sdMin');
  assertFinite(tolerance, 'tolerance');

  if (target <= 0) {
    throw new Error('Probability must be greater than 0.');
  }
  if (sdMin <= 0) {
    throw new Error('Minimum standard deviation (sdMin) must be greater than 0.');
  }
  if (sdMin >= sdMax) {
    throw new Error('Maximum standard deviation (sdMax) must be greater than minimum (sdMin).');
  }

  function getIntervalProbabilities(standardDeviation: number): IntervalProbabilities {
    return getNormalIntervalProbabilities({ halfWidth, nIntervals, standardDeviation });
  }

  // Confirm the target lies between the probabilities the range's endpoints can produce.
  let intervalProbabilities = getIntervalProbabilities(sdMin);
  const minProbability = toFirstProbability(intervalProbabilities);
  const maxProbability = toFirstProbability(getIntervalProbabilities(sdMax));
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
    intervalProbabilities = getIntervalProbabilities(standardDeviation);
    probability = toFirstProbability(intervalProbabilities);

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
    intervalProbabilities,
    iterations,
    standardDeviation,
  };
}

function toFirstProbability(intervalProbabilities: IntervalProbabilities): number {
  return getAtIndexOrThrow(intervalProbabilities.additive, 0);
}

type IntervalProbabilities = ReturnType<typeof getNormalIntervalProbabilities>;

interface NormalDistribution {
  converged: boolean;
  divergenceFromTarget: number;
  intervalProbabilities: IntervalProbabilities;
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
