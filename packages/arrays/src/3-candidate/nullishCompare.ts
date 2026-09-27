import { isNullish } from '@williamthorsen/toolbelt.guards';

/**
 * Returns a comparator that applies `nullishCompare` with the given comparison function and options.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function makeNullishCompare<T>(compare: (a: T, b: T) => number, options: Options = {}): NullishComparer<T> {
  return function compareWithNullishHandling(a: T | null | undefined, b: T | null | undefined): number {
    return nullishCompare(compare, a, b, options);
  };
}

/**
 * Compares two values, using the following rules until the comparison is decided:
 * - If both values are nullish, they have the same rank.
 * - If only one value is nullish, it ranks above the other value, or below it if `options.nullishGreater` is true.
 * - If neither value is nullish, the `compare` function decides.
 * Returns a negative number if `a` ranks above `b`, a positive number if `a` ranks below `b`, or 0 if they have
 * the same rank.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function nullishCompare<T>(
  compare: (a: T, b: T) => number,
  a: Nullish<T>,
  b: Nullish<T>,
  options: Options = {},
): number {
  if (isNullish(a) && isNullish(b)) {
    return 0;
  }
  if (isNullish(a)) {
    return options.nullishGreater ? 1 : -1;
  }
  if (isNullish(b)) {
    return options.nullishGreater ? -1 : 1;
  }
  return compare(a, b) || 0; // Normalize negative 0 to 0
}

// region | Types
type Nullish<T> = T | null | undefined;

type NullishComparer<T> = (a: T | null | undefined, b: T | null | undefined) => number;

interface Options {
  nullishGreater?: boolean; // if true, treat nullish as greater than non-nullish
}
// endregion | Types
