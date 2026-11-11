import { assertFinite } from '../internal/assertFinite.ts';
import { computeErfc } from '../internal/computeErfc.ts';

/**
 * Returns the cumulative distribution function (CDF) for a normal distribution. The relative error stays
 * near double precision throughout the lower tail, down to the smallest representable probabilities.
 *
 * @category Statistics
 * @stage candidate
 */
export function computeCdf(params: ComputeCdfParams): number {
  const { mean = 0, standardDeviation = 1, value } = params;

  assertFinite(mean, 'mean');
  assertFinite(standardDeviation, 'standardDeviation');

  if (Number.isNaN(value)) {
    throw new TypeError('value must not be NaN.');
  }
  if (standardDeviation <= 0) {
    throw new RangeError('standardDeviation must be greater than 0.');
  }

  return 0.5 * computeErfc(-(value - mean) / (standardDeviation * Math.SQRT2));
}

/** Parameters of `computeCdf`: the distribution and the value at which to evaluate it. */
export interface ComputeCdfParams extends NormalDistributionParams {
  value: number;
}

/** The mean and standard deviation of a normal distribution, defaulting to the standard normal's 0 and 1. */
export interface NormalDistributionParams {
  mean?: number | undefined;
  standardDeviation?: number | undefined;
}
