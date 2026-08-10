import type { Seed } from '../internal/evaluateSeed.ts';
import { evaluateSeed } from '../internal/evaluateSeed.ts';
import { computeFakeMathRandom } from '../internal/computeFakeMathRandom.ts';

/**
 * Returns a number generator whose output, when invoked successively, is a pseudo-random
 * series of numbers that deterministically depend on the initial seed (or pseudo-random if no seed is given).
 * This is not intended to be a cryptographically secure random number generator.
 */
export function makeRng(seed?: Seed): () => number {
  const inputSeed = evaluateSeed(seed);
  if (inputSeed === undefined) {
    return Math.random;
  }
  let base = inputSeed;
  return function random() {
    base = (base + 1) % Number.MAX_SAFE_INTEGER;
    return computeFakeMathRandom(base);
  };
}
