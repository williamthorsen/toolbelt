import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { round } from '@williamthorsen/toolbelt.numbers/candidate';

import { assertFinite } from '../internal/assertFinite.ts';
import { assertPositiveInteger } from '../internal/assertPositiveInteger.ts';
import {
  computeNormalIntervalProbabilities,
  type IntervalProbabilities,
} from './computeNormalIntervalProbabilities.ts';

const MAX_ITERATIONS = 50;
const MAX_STANDARD_DEVIATION = 20;
const MIN_STANDARD_DEVIATION = 0.01;
const TOLERANCE = 0.0001; // probability is accepted when it diverges from the target by no more than this fraction

/**
 * Finds the normal distribution that places the requested probability in each of the first and last of
 * `nIntervals` intervals. Bisects the standard-deviation range, across which the first interval's probability
 * increases monotonically.
 *
 * @category Statistics
 * @stage candidate
 */
export function findDistributionByIntervalProbability(
  params: FindDistributionByIntervalProbabilityParams,
  options: FindDistributionByIntervalProbabilityOptions = {},
): NormalDistributionFit {
  const { halfWidth, nIntervals, probability: target } = params;
  const {
    maxIterations = MAX_ITERATIONS,
    maxStandardDeviation = MAX_STANDARD_DEVIATION,
    minStandardDeviation = MIN_STANDARD_DEVIATION,
    tolerance = TOLERANCE,
  } = options;

  assertPositiveInteger(nIntervals, 'nIntervals');
  assertPositiveInteger(maxIterations, 'maxIterations');
  assertFinite(target, 'probability');
  assertFinite(maxStandardDeviation, 'maxStandardDeviation');
  assertFinite(minStandardDeviation, 'minStandardDeviation');
  assertFinite(tolerance, 'tolerance');

  if (target <= 0) {
    throw new RangeError('probability must be greater than 0.');
  }
  if (minStandardDeviation <= 0) {
    throw new RangeError('minStandardDeviation must be greater than 0.');
  }
  if (minStandardDeviation >= maxStandardDeviation) {
    throw new RangeError('maxStandardDeviation must be greater than minStandardDeviation.');
  }
  if (tolerance <= 0) {
    throw new RangeError('tolerance must be greater than 0.');
  }

  /** Returns the interval probabilities at a standard deviation, with the window and interval count held fixed. */
  function computeIntervalProbabilities(standardDeviation: number): IntervalProbabilities {
    return computeNormalIntervalProbabilities({ halfWidth, nIntervals, standardDeviation });
  }

  // Confirm the target lies between the probabilities that the range's endpoints can produce.
  let intervalProbabilities = computeIntervalProbabilities(minStandardDeviation);
  const minProbability = toFirstProbability(intervalProbabilities);
  const maxProbability = toFirstProbability(computeIntervalProbabilities(maxStandardDeviation));
  const range = `standard deviation in range [${minStandardDeviation}, ${maxStandardDeviation}]`;

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

  let low = minStandardDeviation;
  let high = maxStandardDeviation;
  let standardDeviation = minStandardDeviation;
  let probability = minProbability;
  let converged = false;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    standardDeviation = (low + high) / 2;
    intervalProbabilities = computeIntervalProbabilities(standardDeviation);
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

// region | Helpers

/** Returns the probability of the first interval. */
function toFirstProbability(intervalProbabilities: IntervalProbabilities): number {
  return getItemAtIndexOrThrow(intervalProbabilities.additive, 0);
}

// endregion | Helpers

/** Bounds and stopping rules of the search. */
export interface FindDistributionByIntervalProbabilityOptions {
  maxIterations?: number | undefined;
  maxStandardDeviation?: number | undefined;
  minStandardDeviation?: number | undefined;
  tolerance?: number | undefined;
}

/** The window's half-width, the interval count, and the probability sought in each outer interval. */
export interface FindDistributionByIntervalProbabilityParams {
  halfWidth?: number | undefined;
  nIntervals: number;
  probability: number;
}

/** The standard deviation that the search settled on, its interval probabilities, and how the search ended. */
export interface NormalDistributionFit {
  converged: boolean;
  divergenceFromTarget: number;
  intervalProbabilities: IntervalProbabilities;
  iterations: number;
  standardDeviation: number;
}
