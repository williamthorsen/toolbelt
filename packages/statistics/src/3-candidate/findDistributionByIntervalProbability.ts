import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { round } from '@williamthorsen/toolbelt.numbers/candidate';

import { assertPositiveInteger, getNormalIntervalProbabilities } from './getNormalIntervalProbabilities.ts';

const TOLERANCE = 0.0001; // probability is accepted if within the target by no more than this amount

/**
 * Given a probability and a number of intervals, finds the set of interval probabilities following
 * the normal distribution that has the requested probability in the first and last intervals.
 * Uses a bisecting search to find the standard deviation that produces the requested probability.
 */
export function findDistributionByIntervalProbability(params: Params): NormalDistribution {
  const {
    nIntervals,
    probability: target,
    sdMin = 0.005,
    sdMax = 3,
    iteration = 1,
    maxIterations = 50,
    tolerance = TOLERANCE,
  } = params;

  // Special case: with a single interval, the standard deviation is 0 and the probability is 1.
  if (nIntervals === 1) {
    return {
      standardDeviation: 0,
      intervalProbabilities: getNormalIntervalProbabilities({ nIntervals, standardDeviation: 0 }),
      divergenceFromTarget: 1 / target - 1,
      iterations: 1,
    };
  }

  assertPositiveInteger(nIntervals, 'nIntervals');

  if (sdMin >= sdMax) {
    throw new Error('Maximum standard deviation (sdMax) must be greater than minimum (sdMin).');
  }

  const maxProbability = round(1 / nIntervals, 4);
  if (target > 1 / nIntervals) {
    throw new Error(
      `Probability cannot be greater than a uniform probability (${maxProbability}) across ${nIntervals} intervals`,
    );
  }

  if (1 / nIntervals - target < tolerance) {
    const uniformProbabilities = getNormalIntervalProbabilities({ nIntervals, standardDeviation: 0 });
    return {
      standardDeviation: 0,
      intervalProbabilities: uniformProbabilities,
      divergenceFromTarget: getAtIndexOrThrow(uniformProbabilities.additive, 0) / target - 1,
      iterations: iteration,
    };
  }

  const distributions = getDistributions(sdMin, sdMax, nIntervals);
  const bestDistribution = getBestMatchDistribution(distributions, target);
  if (iteration >= maxIterations || isWithinTolerance(bestDistribution.probability, target, tolerance)) {
    return {
      standardDeviation: bestDistribution.standardDeviation,
      intervalProbabilities: getNormalIntervalProbabilities({
        nIntervals,
        standardDeviation: bestDistribution.standardDeviation,
      }),
      divergenceFromTarget: bestDistribution.probability / target - 1,
      iterations: iteration,
    };
  }

  // Narrow the search range: start with a distribution whose probability is below the target and
  // end with one whose probability is above it.
  const startIndex = distributions.findIndex((d) => d.probability < target);

  if (startIndex === -1) {
    throw new Error(`Cannot find requested probability with standard deviation in range [${sdMin}, ${sdMax}]`);
  }
  const lowerProbDistribution = getAtIndexOrThrow(distributions, startIndex - 1);
  const higherProbDistribution = getAtIndexOrThrow(distributions, startIndex);

  const newParams = {
    ...params,
    sdMin: lowerProbDistribution.standardDeviation,
    sdMax: higherProbDistribution.standardDeviation,
    iteration: iteration + 1,
  };
  return findDistributionByIntervalProbability(newParams);
}

/**
 * Returns the distribution whose probability in the first and last intervals is closest to the target.
 */
function getBestMatchDistribution(
  distributions: ReadonlyArray<DistributionSummary>,
  targetProbability: number,
): DistributionSummary {
  const bestMatchDistributions = distributions.toSorted(
    (a, b) => Math.abs(targetProbability - a.probability) - Math.abs(targetProbability - b.probability),
  );
  return getAtIndexOrThrow(bestMatchDistributions, 0);
}

/**
 * Returns probability distributions for the start, middle, and end of the standard-deviation range.
 */
function getDistributions(sdMin: number, sdMax: number, nIntervals: number): DistributionSummary[] {
  const distributions: DistributionSummary[] = [];
  const step = (sdMax - sdMin) / 2;
  for (let i = 0; i < 3; i++) {
    const standardDeviation = sdMin + step * i;
    const probabilities = getNormalIntervalProbabilities({ nIntervals, standardDeviation }).additive;
    distributions.push({
      standardDeviation: round(standardDeviation, 6),
      probability: round(getAtIndexOrThrow(probabilities, 0), 6),
    });
  }
  return distributions;
}

function isWithinTolerance(value: number, target: number, tolerance: number): boolean {
  return Math.abs(value - target) < tolerance;
}

interface DistributionSummary {
  probability: number; // probability of the first interval
  standardDeviation: number;
}

interface NormalDistribution {
  standardDeviation: number;
  intervalProbabilities: ReturnType<typeof getNormalIntervalProbabilities>;
  divergenceFromTarget: number;
  iterations: number;
}

interface Params {
  nIntervals: number;
  probability: number;
  tolerance?: number | undefined;
  sdMin?: number | undefined;
  sdMax?: number | undefined;
  iteration?: number | undefined;
  maxIterations?: number | undefined;
}
