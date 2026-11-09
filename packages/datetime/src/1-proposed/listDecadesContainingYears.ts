import { assertValidYear } from './assertValidYear.ts';
import { buildDecadeContaining, type Decade } from './buildDecadeContaining.ts';

/**
 * Lists the decades that contain the given years, in ascending order, each with its start, end, and label.
 * A decade starts in a year that is a multiple of 10 (e.g., 1990, 2000, etc.).
 * A decade ends 9 years after its start (e.g., 1990-1999, 2000-2009, etc.).
 * Throws a `RangeError` if any year is not a safe non-negative integer.
 *
 * @category DateTime
 * @experimental
 * @stage proposed
 * @example
 * Input: [1960, 1992, 1993, 2001]
 * Output: [
 *  { start: 1960, end: 1969, label: '1960s' },
 *  { start: 1990, end: 1999, label: '1990s' },
 *  { start: 2000, end: 2009, label: '2000s' }
 *  ]
 */
export function listDecadesContainingYears(years: number[]): Decade[] {
  for (const year of years) {
    assertValidYear(year);
  }

  const uniqueYears = [...new Set(years)].toSorted((a, b) => a - b);
  const decadesMap = new Map<number, Decade>();

  for (const year of uniqueYears) {
    const decade = buildDecadeContaining(year);
    if (!decadesMap.has(decade.start)) {
      decadesMap.set(decade.start, decade);
    }
  }

  return decadesMap.values().toArray();
}
