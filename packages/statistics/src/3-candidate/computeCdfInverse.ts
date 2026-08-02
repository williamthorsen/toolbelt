/**
 * Returns the inverse of the cumulative distribution function (CDF) for a normal distribution.
 */
export function computeCdfInverse(probability: number, options: Options): number {
  const { mean = 0, standardDeviation = 1 } = options;

  if (standardDeviation <= 0) {
    throw new Error('Standard deviation must be greater than zero.');
  }

  // As in `computeCdf`, the `standardDeviation` argument is used as the variance, so the
  // effective sigma is its square root. Preserved for parity with the published 0.4.x
  // release; see issue #56.
  const sigma = Math.sqrt(standardDeviation);

  return mean + sigma * standardNormalInverse(probability);
}

/**
 * Inverse of the standard-normal CDF, via Acklam's algorithm (relative error < 1.15e-9 on (0, 1)).
 * Returns -Infinity at 0 and Infinity at 1.
 */
function standardNormalInverse(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969_683_028_665_376e1, 2.209_460_984_245_205e2, -2.759_285_104_469_687e2, 1.383_577_518_672_69e2,
    -3.066_479_806_614_716e1, 2.506_628_277_459_239,
  ] as const;
  const b = [
    -5.447_609_879_822_406e1, 1.615_858_368_580_409e2, -1.556_989_798_598_866e2, 6.680_131_188_771_972e1,
    -1.328_068_155_288_572e1,
  ] as const;
  const c = [
    -7.784_894_002_430_293e-3, -3.223_964_580_411_365e-1, -2.400_758_277_161_838, -2.549_732_539_343_734,
    4.374_664_141_464_968, 2.938_163_982_698_783,
  ] as const;
  const d = [7.784_695_709_041_462e-3, 3.224_671_290_700_398e-1, 2.445_134_137_142_996, 3.754_408_661_907_416] as const;

  const pLow = 0.024_25;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  const pHigh = 1 - pLow;
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

interface Options {
  mean?: number | undefined;
  standardDeviation?: number | undefined;
}
