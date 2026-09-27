import { computeFakeMathRandom } from './computeFakeMathRandom.ts';

const MAX_INTEGER = 2 ** 31 - 1; // 2147483647

/**
 * Wrapper for `toIntegerSeed` that provides static properties for generating new seeds.
 *
 * @internal
 */
export const IntegerSeed = {
  max: MAX_INTEGER,
  multiplier: 16_807,
  /** Converts a value to an integer seed, drawing a random value when none is given. */
  toInt(value = Math.random()): number {
    return toIntegerSeed(value);
  },
  /** Returns the seed that follows the given one in the Lehmer sequence. */
  next(seed: number): number {
    return (seed * IntegerSeed.multiplier) % IntegerSeed.max;
  },
};

/**
 * Deterministically maps any number to an integer in the range [1, 2147483647].
 */
function toIntegerSeed(value: number): number {
  let integer = (() => {
    if (Number.isSafeInteger(value)) return value;

    return Math.floor(computeFakeMathRandom(value) * MAX_INTEGER);
  })();

  // Constrain the integer to the range [1, MAX_INTEGER]
  integer %= MAX_INTEGER;
  if (integer <= 0) {
    integer += MAX_INTEGER;
  }
  return integer;
}
