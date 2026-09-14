/*!
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunPro, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 */

// Ported from FreeBSD msun's `s_erf.c`. Each table lists a polynomial's coefficients in ascending order, and
// its comment names the fdlibm constants that it holds.

// erx: the constant term of the approximation near 1, which fdlibm takes as 0.84506291151 rounded to single
// precision.
const NEAR_ONE_OFFSET = 0.845_062_911_510_467_5;

// pp0-pp4, and qq1-qq5 after a leading 1: erf(x) = x + x * P(x^2) / Q(x^2) for |x| < 0.84375.
const SMALL_NUMERATOR = [
  0.128_379_167_095_512_56, -0.325_042_107_247_001_5, -0.028_481_749_575_598_51, -0.005_770_270_296_489_442,
  -0.000_023_763_016_656_650_163,
] as const;
const SMALL_DENOMINATOR = [
  1, 0.397_917_223_959_155_35, 0.065_022_249_988_767_3, 0.005_081_306_281_875_766, 0.000_132_494_738_004_321_64,
  -0.000_003_960_228_278_775_368,
] as const;

// pa0-pa6, and qa1-qa6 after a leading 1: erf(1 + s) = erx + P(s) / Q(s) for 0.84375 <= |x| < 1.25.
const NEAR_ONE_NUMERATOR = [
  -0.002_362_118_560_752_659_4, 0.414_856_118_683_748_33, -0.372_207_876_035_701_3, 0.318_346_619_901_161_75,
  -0.110_894_694_282_396_68, 0.035_478_304_325_618_236, -0.002_166_375_594_868_791,
] as const;
const NEAR_ONE_DENOMINATOR = [
  1, 0.106_420_880_400_844_23, 0.540_397_917_702_171, 0.071_828_654_414_196_27, 0.126_171_219_808_761_64,
  0.013_637_083_912_029_05, 0.011_984_499_846_799_107,
] as const;

// ra0-ra7, and sa1-sa8 after a leading 1: erfc(x) = exp(-x^2 - 0.5625 + R(1/x^2) / S(1/x^2)) / x
// for 1.25 <= |x| < 1/0.35.
const MIDDLE_TAIL_NUMERATOR = [
  -0.009_864_944_034_847_148, -0.693_858_572_707_181_8, -10.558_626_225_323_291, -62.375_332_450_326_006,
  -162.396_669_462_573_47, -184.605_092_906_711_04, -81.287_435_506_306_6, -9.814_329_344_169_145,
] as const;
const MIDDLE_TAIL_DENOMINATOR = [
  1, 19.651_271_667_439_257, 137.657_754_143_519_04, 434.565_877_475_229_23, 645.387_271_733_267_9,
  429.008_140_027_567_83, 108.635_005_541_779_44, 6.570_249_770_319_282, -0.060_424_415_214_858_1,
] as const;

// rb0-rb6, and sb1-sb7 after a leading 1: the same form for 1/0.35 <= |x| < 28.
const FAR_TAIL_NUMERATOR = [
  -0.009_864_942_924_700_1, -0.799_283_237_680_523, -17.757_954_917_754_752, -160.636_384_855_821_92,
  -637.566_443_368_389_6, -1_025.095_131_611_077_2, -483.519_191_608_651_4,
] as const;
const FAR_TAIL_DENOMINATOR = [
  1, 30.338_060_743_482_46, 325.792_512_996_573_9, 1_536.729_586_084_437, 3_199.858_219_508_595_5,
  2_553.050_406_433_164_4, 474.528_541_206_955_37, -22.440_952_446_585_82,
] as const;

const lowWordView = new DataView(new ArrayBuffer(8));

/**
 * Returns the complementary error function, 1 - erf(x), with a relative error near double precision
 * wherever the result is representable.
 *
 * @internal
 */
export function erfc(x: number): number {
  if (Number.isNaN(x)) return x;

  const magnitude = Math.abs(x);

  if (magnitude < 0.843_75) {
    if (magnitude < 2 ** -56) return 1 - x;

    const ratio = evaluateRatio(SMALL_NUMERATOR, SMALL_DENOMINATOR, x * x);
    // From 1/4 upward, x - 1/2 is exact, and grouping around 1/2 avoids the rounding in 1 - erf(x).
    return x < 0.25 ? 1 - (x + x * ratio) : 0.5 - (x * ratio + (x - 0.5));
  }

  if (magnitude < 1.25) {
    const ratio = evaluateRatio(NEAR_ONE_NUMERATOR, NEAR_ONE_DENOMINATOR, magnitude - 1);
    return x > 0 ? 1 - NEAR_ONE_OFFSET - ratio : 1 + (NEAR_ONE_OFFSET + ratio);
  }

  if (magnitude < 28) {
    const tail = computeTail(magnitude);
    return x > 0 ? tail : 2 - tail;
  }

  return x > 0 ? 0 : 2;
}

// region | Helpers

/** Returns the value with the low 32 bits of its IEEE 754 representation cleared. */
function clearLowWord(value: number): number {
  lowWordView.setFloat64(0, value);
  lowWordView.setUint32(4, 0);
  return lowWordView.getFloat64(0);
}

/** Returns erfc(magnitude) for 1.25 <= magnitude < 28. */
function computeTail(magnitude: number): number {
  const inverseSquare = 1 / (magnitude * magnitude);
  const correction =
    magnitude < 1 / 0.35
      ? evaluateRatio(MIDDLE_TAIL_NUMERATOR, MIDDLE_TAIL_DENOMINATOR, inverseSquare)
      : evaluateRatio(FAR_TAIL_NUMERATOR, FAR_TAIL_DENOMINATOR, inverseSquare);

  // The truncated magnitude has at most 21 significant bits, which makes its square exact; the product
  // (truncated - magnitude) * (truncated + magnitude) holds the rest of magnitude^2.
  const truncated = clearLowWord(magnitude);
  return (
    (Math.exp(-truncated * truncated - 0.562_5) *
      Math.exp((truncated - magnitude) * (truncated + magnitude) + correction)) /
    magnitude
  );
}

/** Evaluates a polynomial, given its coefficients in ascending order, by Horner's method. */
function evaluatePolynomial(coefficients: readonly number[], x: number): number {
  return coefficients.reduceRight((accumulator, coefficient) => accumulator * x + coefficient, 0);
}

/** Returns the quotient of two polynomials evaluated at the same point. */
function evaluateRatio(numerator: readonly number[], denominator: readonly number[], x: number): number {
  return evaluatePolynomial(numerator, x) / evaluatePolynomial(denominator, x);
}

// endregion | Helpers
