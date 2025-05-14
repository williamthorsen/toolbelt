export function evaluateSeed(seed: Seed | undefined): number | undefined {
  if (typeof seed === 'number') {
    return seed;
  } else if (checkIsRngLike(seed)) {
    return seed.next();
    // eslint-disable-next-line unicorn/no-instanceof-builtins
  } else if (seed instanceof Function) {
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
  next(): number;
  seed: number;
}

export type Seed = number | SeededGenerator | (() => number);
