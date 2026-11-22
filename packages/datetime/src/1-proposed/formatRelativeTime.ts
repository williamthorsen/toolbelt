import { TimeUnit } from '../3-candidate/TimeUnit.ts';

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/** The units below a year, finest first, each with the elapsed time at which the next coarser unit takes over. */
const UNIT_STEPS: ReadonlyArray<UnitStep> = [
  { unit: 'second', inMillis: TimeUnit.Seconds.inMillis, below: TimeUnit.Minutes.inMillis },
  { unit: 'minute', inMillis: TimeUnit.Minutes.inMillis, below: TimeUnit.Hours.inMillis },
  { unit: 'hour', inMillis: TimeUnit.Hours.inMillis, below: TimeUnit.Days.inMillis },
  { unit: 'day', inMillis: TimeUnit.Days.inMillis, below: DAYS_PER_MONTH * TimeUnit.Days.inMillis },
  {
    unit: 'month',
    inMillis: DAYS_PER_MONTH * TimeUnit.Days.inMillis,
    below: DAYS_PER_YEAR * TimeUnit.Days.inMillis,
  },
];

const YEAR_STEP: UnitStep = {
  unit: 'year',
  inMillis: DAYS_PER_YEAR * TimeUnit.Days.inMillis,
  below: Infinity,
};

/**
 * Describes a time relative to `now`, such as "3 days ago", "yesterday", or "in 2 hours", in the largest unit that
 * the elapsed time reaches. The count is truncated toward zero, so 47 hours ago reads "yesterday". A month is 30 days
 * and a year is 365 days. Elapsed time below one second reads "now".
 *
 * `now` is a parameter rather than read from the clock, so that one value renders a whole table consistently and a
 * test controls time.
 *
 * @example
 * const now = Date.parse('2026-11-22T12:00:00Z');
 * formatRelativeTime('2026-11-19T12:00:00Z', now, { locale: 'en' }); // '3 days ago'
 * formatRelativeTime('2026-11-21T09:00:00Z', now, { locale: 'en' }); // 'yesterday'
 * formatRelativeTime('2026-11-22T14:00:00Z', now, { locale: 'en' }); // 'in 2 hours'
 *
 * @category DateTime
 * @experimental
 * @stage proposed
 * @throws If `iso` does not resolve to a valid date, or if `now` is `NaN` or infinite.
 */
export function formatRelativeTime(iso: string, now: number, options: FormatRelativeTimeOptions = {}): string {
  const { locale } = options;
  const elapsed = new Date(iso).getTime() - now;
  assertValidArguments(iso, now, elapsed);

  const { count, unit } = selectUnitCount(elapsed);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  return formatter.format(count, unit);
}

export interface FormatRelativeTimeOptions {
  /** The locale in which to format the text. Defaults to the runtime's default locale. */
  locale?: Intl.LocalesArgument | undefined;
}

interface UnitStep {
  /** The absolute elapsed time, in milliseconds, at which the next coarser unit takes over. */
  below: number;
  inMillis: number;
  unit: Intl.RelativeTimeFormatUnit;
}

// region | Helpers

/**
 * Rejects an `iso` or a `now` that does not resolve to a point in time.
 */
function assertValidArguments(iso: string, now: number, elapsed: number): void | never {
  if (!Number.isFinite(now)) {
    throw new RangeError(`now must be a finite number of milliseconds since the epoch, but was ${now}.`);
  }
  if (Number.isNaN(elapsed)) {
    throw new RangeError(`Expected a valid date, but got "${iso}".`);
  }
}

/**
 * Picks the largest unit that the elapsed time reaches and the whole count of that unit, signed as the elapsed time is.
 */
function selectUnitCount(elapsed: number): { count: number; unit: Intl.RelativeTimeFormatUnit } {
  const magnitude = Math.abs(elapsed);
  const step = UNIT_STEPS.find(({ below }) => magnitude < below) ?? YEAR_STEP;

  return { count: Math.trunc(elapsed / step.inMillis), unit: step.unit };
}

// endregion | Helpers
