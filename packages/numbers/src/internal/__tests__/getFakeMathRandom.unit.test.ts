import { describe, expect, it } from 'vitest';

import { getFakeMathRandom } from '../getFakeMathRandom.ts';

// Added to demonstrate that these tests also pass in the distribution bundle after transpilation

describe(getFakeMathRandom, () => {
  const testCases = [
    { seed: 0.1, expected: 0.631_793_978_918_247_8 },
    { seed: 1, expected: 0.003_280_733_247_883_959_5 },
    { seed: 1_234, expected: 0.067_474_613_463_261_45 },
    { seed: 1_235, expected: 0.960_461_460_501_170_4 },
    { seed: 1_236, expected: 0.853_677_195_894_381_6 },
    { seed: 123_456_789, expected: 0.733_716_916_634_569_4 },
    { seed: 0.387_782_332_202_318_3, expected: 0.325_166_345_725_379_1 },
  ];

  it.each(testCases)('given the same seed, always returns the same value (seed $seed)', ({ seed, expected }) => {
    expect(getFakeMathRandom(seed)).toBe(expected);
  });
});
