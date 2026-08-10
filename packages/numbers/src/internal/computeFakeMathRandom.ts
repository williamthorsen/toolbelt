/* eslint unicorn/prefer-math-trunc: off */

/**
 * Deterministically computes and returns a number in the range [0, 1) based on the input.
 *
 * @internal
 */
export function computeFakeMathRandom(seed: number): number {
  // Convert the seed to a string representation to extract as much variation
  const strSeed = seed.toString().replace('.', ''); // Remove the decimal point for further processing

  let hash = 0;

  // Use a string-based hashing approach
  for (const char of strSeed) {
    const code = char.codePointAt(0) ?? 0;
    hash = (hash << 5) - hash + code;
    hash |= 0; // Ensure a 32-bit integer
  }

  // Mix the bits a little
  hash += hash << 10;
  hash ^= hash >> 6;
  hash += hash << 3;
  hash ^= hash >> 11;
  hash += hash << 15;

  // Convert to a number in the range [0, 1)
  return (hash & 0x7fff_ffff) / 0x7fff_ffff;
}
