import type { Seed } from './evaluateSeed.ts';
import { evaluateSeed } from './evaluateSeed.ts';
import { getFakeMathRandom } from './getFakeMathRandom.ts';
import { scale } from './scale.ts';

/**
 * Returns a scaled random number in the range [min, max).
 */
export function random(options: Options = {}): number {
  const { min = 0, max = 1 } = options;

  const seed = evaluateSeed(options.seed);
  const randomNumber = seed === undefined ? Math.random() : getFakeMathRandom(seed);

  return scale(randomNumber, { min, max });
}

interface Options {
  max?: number | undefined;
  min?: number | undefined;
  seed?: Seed | undefined;
}
