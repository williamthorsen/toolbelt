import type { Seed } from './evaluateSeed.ts';
import { evaluateSeed } from './evaluateSeed.ts';
import { getFakeMathRandom } from './getFakeMathRandom.ts';

/**
 * Returns a number generator whose output, when invoked successively, is a pseudo-random
 * series of numbers that deterministically depend on the initial seed (or pseudo-random if no seed is given).
 * This is not intended to be a cryptographically secure random number generator.
 */
export function createNumberGenerator(seed?: Seed): () => number {
  const inputSeed = evaluateSeed(seed);
  if (inputSeed === undefined) {
    return Math.random;
  }
  let base = inputSeed;
  return function random() {
    base = (base + 1) % Number.MAX_SAFE_INTEGER;
    return getFakeMathRandom(base);
  };
}
