/**
 * Builds the decade containing a year: the ten years starting at the nearest multiple of 10 at or below it.
 */
export function buildDecadeContaining(year: number): Decade {
  const start = Math.floor(year / 10) * 10;
  return { start, end: start + 9, label: `${start}s` };
}

export interface Decade {
  start: number;
  end: number;
  label: string;
}
