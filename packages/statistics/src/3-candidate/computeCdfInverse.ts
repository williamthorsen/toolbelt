import { assertFinite } from '../internal/assertFinite.ts';
import { evaluatePolynomial, evaluateRatio } from '../internal/polynomials.ts';
import { computeCdf, type NormalDistributionParams } from './computeCdf.ts';

// Acklam's coefficients, each table in ascending order and each denominator with its constant 1 written out.

// a6-a1 and b5-b1: Phi^-1(p) = q * A(q^2) / B(q^2), with q = p - 0.5, for TAIL_BOUNDARY <= p <= 0.5.
const CENTRAL_NUMERATOR = [
  2.506_628_277_459_239, -3.066_479_806_614_716e1, 1.383_577_518_672_69e2, -2.759_285_104_469_687e2,
  2.209_460_984_245_205e2, -3.969_683_028_665_376e1,
] as const;
const CENTRAL_DENOMINATOR = [
  1, -1.328_068_155_288_572e1, 6.680_131_188_771_972e1, -1.556_989_798_598_866e2, 1.615_858_368_580_409e2,
  -5.447_609_879_822_406e1,
] as const;

// c6-c1 and d4-d1: Phi^-1(p) = C(q) / D(q), with q = sqrt(-2 ln p), for 0 < p < TAIL_BOUNDARY.
const TAIL_NUMERATOR = [
  2.938_163_982_698_783, 4.374_664_141_464_968, -2.549_732_539_343_734, -2.400_758_277_161_838,
  -3.223_964_580_411_365e-1, -7.784_894_002_430_293e-3,
] as const;
const TAIL_DENOMINATOR = [
  1, 3.754_408_661_907_416, 2.445_134_137_142_996, 3.224_671_290_700_398e-1, 7.784_695_709_041_462e-3,
] as const;

const TAIL_BOUNDARY = 0.024_25;

/**
 * Returns the inverse of the cumulative distribution function (CDF) for a normal distribution. A round
 * trip through `computeCdf` recovers the value to near double precision up to about 3.5 standard
 * deviations above the mean; farther above, probabilities round toward 1 and the round trip loses precision.
 *
 * @category Statistics
 * @stage candidate
 */
export function computeCdfInverse(probability: number, options: NormalDistributionParams = {}): number {
  const { mean = 0, standardDeviation = 1 } = options;

  assertFinite(probability, 'probability');
  assertFinite(mean, 'mean');
  assertFinite(standardDeviation, 'standardDeviation');

  if (probability < 0 || probability > 1) {
    throw new RangeError('probability must be in the range [0, 1].');
  }
  if (standardDeviation <= 0) {
    throw new RangeError('standardDeviation must be greater than 0.');
  }

  return mean + standardDeviation * computeStandardNormalInverse(probability);
}

// region | Helpers

/**
 * Returns the inverse of the standard-normal CDF: Acklam's estimate, corrected by one Halley step against
 * `computeCdf`. Returns -Infinity at 0 and Infinity at 1.
 */
function computeStandardNormalInverse(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p > 0.5) return -computeStandardNormalInverse(1 - p);

  const estimate = estimateStandardNormalInverse(p);
  const error = computeCdf({ value: estimate }) - p;
  const correction = error * Math.sqrt(2 * Math.PI) * Math.exp((estimate * estimate) / 2);

  // For a probability below about 6e-311, exp(estimate^2 / 2) overflows.
  if (!Number.isFinite(correction)) return estimate;

  return estimate - correction / (1 + (estimate * correction) / 2);
}

/**
 * Estimates the inverse of the standard-normal CDF on (0, 0.5] by Acklam's algorithm, to a relative error
 * below 1.15e-9.
 */
function estimateStandardNormalInverse(p: number): number {
  if (p < TAIL_BOUNDARY) {
    return evaluateRatio(TAIL_NUMERATOR, TAIL_DENOMINATOR, Math.sqrt(-2 * Math.log(p)));
  }

  const q = p - 0.5;
  const r = q * q;
  return (evaluatePolynomial(CENTRAL_NUMERATOR, r) * q) / evaluatePolynomial(CENTRAL_DENOMINATOR, r);
}

// endregion | Helpers
