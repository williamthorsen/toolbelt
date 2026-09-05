import type { Decade } from './listDecadesContainingYears.ts';

/**
 * Given a range of years, identify the decades containing those years and return a list of objects
 * containing the start, end, and label for each decade.
 * A decade starts in a year that is a multiple of 10 (e.g., 1990, 2000, etc.).
 * A decade ends 9 years after its start (e.g., 1990-1999, 2000-2009, etc.).
 */
export function listDecadesContainingRange(range: { start: number; end: number }): Decade[] {
  const { start, end } = range;

  if (start < 0 || end < 0) {
    throw new RangeError(`Negative years are not supported: start = ${start}, end = ${end}.`);
  }

  if (start > end) return [];

  const firstDecadeStart = Math.floor(start / 10) * 10;
  const lastDecadeStart = Math.floor(end / 10) * 10;

  const decades: Decade[] = [];

  for (let year = firstDecadeStart; year <= lastDecadeStart; year += 10) {
    decades.push({
      start: year,
      end: year + 9,
      label: `${year}s`,
    });
  }

  return decades;
}
