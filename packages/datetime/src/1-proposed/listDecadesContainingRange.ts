import { assertValidYear } from './assertValidYear.ts';
import { buildDecadeContaining, type Decade } from './buildDecadeContaining.ts';

/**
 * Lists the decades that contain the years of an inclusive range, each with its start, end, and label.
 * A decade starts in a year that is a multiple of 10 (e.g., 1990, 2000, etc.).
 * A decade ends 9 years after its start (e.g., 1990-1999, 2000-2009, etc.).
 * Throws a `RangeError` if either bound is not a safe non-negative integer.
 *
 * @category DateTime
 * @experimental
 * @stage proposed
 */
export function listDecadesContainingRange(range: { start: number; end: number }): Decade[] {
  const { start, end } = range;
  assertValidYear(start);
  assertValidYear(end);

  if (start > end) return [];

  const lastDecadeStart = buildDecadeContaining(end).start;
  const decades: Decade[] = [];
  for (let year = buildDecadeContaining(start).start; year <= lastDecadeStart; year += 10) {
    decades.push(buildDecadeContaining(year));
  }

  return decades;
}
