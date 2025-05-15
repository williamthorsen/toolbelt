/**
 * Accepts a comparison function and returns a new function that adds handling of nullish values and optional
 * comparison reversal.
 */
export function createNullishComparer<T>(compare: (a: T, b: T) => number, options: Options = {}): NullishComparer<T> {
  return function compareWithNullishHandling(a: T | null | undefined, b: T | null | undefined): number {
    return nullishCompare(compare, a, b, options);
  };
}

/**
 * Compares two values, using the following rules until the comparison is decided:
 * - If both values are nullish, they are considered to be equal.
 * - If only one value is nullish, it is considered to rank above the other value, unless `options.nullishGreater`
 *   is true, in which case it is considered to rank higher.
 * - If neither value is nullish, the `compare` function is used to compare them.
 * Returns a negative number if `a` ranks higher than `b`, a positive number if `a` ranks below `b`, or 0 if they
 *  have the same rank.
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
  return compare(a, b) || 0; // avoids returning negative 0
}

// region | Helpers
function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
// endregion | Helpers

// region | Types
type Nullish<T> = T | null | undefined;

type NullishComparer<T> = (a: T | null | undefined, b: T | null | undefined) => number;

interface Options {
  nullishGreater?: boolean; // if true, treat nullish as greater than non-nullish
}
// endregion | Types
