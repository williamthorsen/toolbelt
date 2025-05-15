/**
 * Given a compare function, returns a new function that performs the same comparison but returns the opposite result.
 *
 * @category Array
 * @experimental
 * @stage strawman
 */
export function reverseComparator<T>(compare: Compare<T>): Compare<T> {
  return (a, b) => compare(b, a);
}

type Compare<T> = (a: T, b: T) => number;
