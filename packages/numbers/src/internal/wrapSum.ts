/**
 * Returns the sum of the given addends, wrapping around from 0 when the given max is exceeded.
 *
 * @internal
 */
export function wrapSum(max: number, ...addends: number[]): number {
  let sum = 0;

  for (const addend of addends) {
    const result = (sum + addend) % max;
    sum = result >= 0 ? result : result + max;
  }

  return sum;
}
