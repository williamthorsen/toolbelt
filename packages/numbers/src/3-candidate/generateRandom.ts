import type { Seed } from '../internal/evaluateSeed.ts';
import { evaluateSeed } from '../internal/evaluateSeed.ts';
import { computeFakeMathRandom } from '../internal/computeFakeMathRandom.ts';
import { scale } from './scale.ts';

/**
 * Returns a scaled random number in the range [min, max).
 */
export function generateRandom(options: Options = {}): number {
  const { min = 0, max = 1 } = options;

  const seed = evaluateSeed(options.seed);
  const randomNumber = seed === undefined ? Math.random() : computeFakeMathRandom(seed);

  return scale(randomNumber, { min, max });
}

interface Options {
  max?: number | undefined;
  min?: number | undefined;
  seed?: Seed | undefined;
}
