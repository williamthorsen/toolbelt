/**
 * Given a list of years, identify the decades containing those years and return a list of objects
 * containing the start, end, and label for each decade.
 * A decade starts a year that is a multiple of 10 (e.g., 1990, 2000, etc.).
 * A decade ends 9 years after its start (e.g., 1990-1999, 2000-2009, etc.).
 *
 * @example
 * Input: [1960, 1992, 1993, 2001]
 * Output: [
 *  { start: 1960, end: 1969, label: '1960s' },
 *  { start: 1990, end: 1999, label: '1990s' },
 *  { start: 2000, end: 2009, label: '2000s' }
 *  ]
 */
export function getDecadesContainingYears(years: number[]): Decade[] {
  const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
  const decadesMap = new Map<number, { start: number; end: number; label: string }>();

  const [firstYear] = uniqueYears;
  if (firstYear === undefined) {
    return [];
  }
  if (firstYear < 0) {
    throw new RangeError(`Negative years are not supported.`);
  }

  for (const year of uniqueYears) {
    const start = Math.floor(year / 10) * 10;
    if (!decadesMap.has(start)) {
      decadesMap.set(start, {
        start,
        end: start + 9,
        label: `${start}s`,
      });
    }
  }

  return [...decadesMap.values()];
}

export interface Decade {
  start: number;
  end: number;
  label: string;
}
