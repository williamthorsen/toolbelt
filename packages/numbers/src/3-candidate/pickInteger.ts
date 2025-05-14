import type { Seed } from '../internal/evaluateSeed.ts';
import { random } from './random.ts';

/**
 * Returns a random integer between the bounds inclusive.
 * If the bounds are not integers, they are truncated to integers.
 */
export function pickInteger(params: Params = {}): number {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, seed } = params;

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new RangeError('Invalid range: min and max must be finite.');
  }

  if (min > max) {
    throw new RangeError('Invalid range: min must be less than or equal to max.');
  }

  const start = Math.trunc(Math.min(min, max));
  const end = Math.trunc(Math.max(min, max));

  if (start === end) {
    return start;
  }
  const range = end - start + 1;

  return start + Math.floor(random({ seed }) * range);
}

interface Params {
  max?: number | undefined;
  min?: number | undefined;
  seed?: Seed | undefined;
}
