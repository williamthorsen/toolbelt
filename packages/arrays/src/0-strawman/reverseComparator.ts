/**
 * Returns a comparator that performs the same comparison as `compare` but returns the opposite result.
 *
 * @category Array
 * @experimental
 * @stage strawman
 */
export function reverseComparator<T>(compare: Compare<T>): Compare<T> {
  return (a, b) => compare(b, a);
}

type Compare<T> = (a: T, b: T) => number;
