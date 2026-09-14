import { computeErfc } from '../internal/computeErfc.ts';

/**
 * Returns the cumulative distribution function (CDF) for a normal distribution. The relative error stays
 * near double precision throughout the lower tail, down to the smallest representable probabilities.
 *
 * @category Statistics
 * @stage candidate
 */
export function computeCdf(params: Params): number {
  const { mean = 0, standardDeviation = 1, value } = params;

  if (standardDeviation <= 0) {
    throw new Error('Standard deviation must be greater than zero.');
  }

  return 0.5 * computeErfc(-(value - mean) / (standardDeviation * Math.SQRT2));
}

interface Params {
  mean?: number | undefined;
  standardDeviation?: number | undefined;
  value: number;
}
