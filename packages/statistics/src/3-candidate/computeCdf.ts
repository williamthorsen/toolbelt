/**
 * Returns the cumulative distribution function (CDF) for a normal distribution.
 */
export function computeCdf(params: Params): number {
  const { mean = 0, standardDeviation = 1, value } = params;

  if (standardDeviation <= 0) {
    throw new Error('Standard deviation must be greater than zero.');
  }

  return 0.5 * (1 + erf((value - mean) / (standardDeviation * Math.SQRT2)));
}

/**
 * Error function, via the Abramowitz & Stegun 7.1.26 approximation (max error ~1.5e-7).
 */
function erf(x: number): number {
  const t = 1 / (1 + 0.327_591_1 * Math.abs(x));
  const y =
    1 -
    ((((1.061_405_429 * t - 1.453_152_027) * t + 1.421_413_741) * t - 0.284_496_736) * t + 0.254_829_592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

interface Params {
  mean?: number | undefined;
  standardDeviation?: number | undefined;
  value: number;
}
