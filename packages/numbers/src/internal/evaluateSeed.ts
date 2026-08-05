export function evaluateSeed(seed: Seed | undefined): number | undefined {
  if (typeof seed === 'number') {
    return seed;
  }
  if (checkIsRngLike(seed)) {
    return seed.next();
  }
  if (typeof seed === 'function') {
    return seed();
  }
  return undefined;
}

export function checkIsRngLike(seed: Seed | undefined): seed is SeededGenerator {
  return typeof seed === 'object' && 'next' in seed && 'seed' in seed;
}

/**
 * Interface describing an object that returns a sequence of numbers.
 */
export interface SeededGenerator {
  seed: number;
  next(): number;
}

export type Seed = number | SeededGenerator | (() => number);
