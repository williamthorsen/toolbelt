import { TimeUnit } from '../2-draft/index.ts';

const FINEST_INDEX = TimeUnit.coarsestFirst.length - 1;

/**
 * Renders a duration as up to `maxUnits` short-labeled components, running from the coarsest unit
 * holding at least one whole count down toward milliseconds. The duration is rounded once, at the
 * finest unit shown, and the leading unit is chosen from the rounded value, so a rounding carry
 * promotes to the coarser unit rather than reporting `60s`. A component whose count is zero is
 * omitted unless it leads, so `maxUnits` caps the precision instead of padding with zeros.
 *
 * @example
 * formatDuration(240_000); // '4m'
 * formatDuration(250_300, { maxUnits: 2 }); // '4m 10s'
 * formatDuration(0); // '0ms'
 *
 * @category DateTime
 * @experimental
 * @stage proposed
 */
export function formatDuration(milliseconds: number, options: FormatDurationOptions = {}): string {
  const { maxUnits = 1 } = options;
  assertValidArguments(milliseconds, maxUnits);

  const components = selectComponents(milliseconds, maxUnits);

  return components.map(({ count, unit }) => unit.getLabeledCount(count, { format: 'short' })).join(' ');
}

export interface FormatDurationOptions {
  /** The greatest number of units to render. Defaults to 1, the coarsest unit alone. */
  maxUnits?: number | undefined;
}

/**
 * Rounds the duration and splits it into the components to render, from the leading unit down.
 * Each attempt rounds the original duration rather than an already-rounded one, so the result is
 * rounded exactly once however often the leading unit moves.
 */
function selectComponents(milliseconds: number, maxUnits: number): DurationComponent[] {
  let leadingIndex = selectLeadingIndex(milliseconds);

  for (;;) {
    const shownUnits = TimeUnit.coarsestFirst.slice(leadingIndex, leadingIndex + maxUnits);
    const rounded = roundToFinest(milliseconds, shownUnits);

    // Rounding can carry the duration past a unit boundary. A lower index is a coarser unit, so
    // continuing only while the leading unit coarsens both resolves the carry and terminates.
    const carriedIndex = selectLeadingIndex(rounded);
    if (carriedIndex >= leadingIndex) {
      return decompose(rounded, shownUnits);
    }
    leadingIndex = carriedIndex;
  }
}

/**
 * Returns the index of the coarsest unit holding at least one whole count, falling back to the
 * finest unit for a duration shorter than one of any unit.
 */
function selectLeadingIndex(milliseconds: number): number {
  const index = TimeUnit.coarsestFirst.findIndex((unit) => milliseconds >= unit.inMillis);

  return index === -1 ? FINEST_INDEX : index;
}

/**
 * Rounds a duration to a whole number of the finest unit shown, returning the result in
 * milliseconds. The finest unit is the one spanning the fewest milliseconds.
 */
function roundToFinest(milliseconds: number, shownUnits: ReadonlyArray<TimeUnit>): number {
  const finestInMillis = Math.min(...shownUnits.map((unit) => unit.inMillis));

  return Math.round(milliseconds / finestInMillis) * finestInMillis;
}

/**
 * Splits an exact multiple of the finest unit into whole counts. Both operands of every division
 * are whole numbers of milliseconds, so no quotient or remainder loses precision.
 */
function decompose(milliseconds: number, shownUnits: ReadonlyArray<TimeUnit>): DurationComponent[] {
  const components: DurationComponent[] = [];
  let remainder = milliseconds;

  for (const [index, unit] of shownUnits.entries()) {
    const count = Math.floor(remainder / unit.inMillis);
    remainder -= count * unit.inMillis;

    if (index === 0 || count > 0) {
      components.push({ count, unit });
    }
  }

  return components;
}

function assertValidArguments(milliseconds: number, maxUnits: number): void | never {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RangeError(`Duration must be a non-negative finite number of milliseconds, but was ${milliseconds}.`);
  }
  if (!Number.isSafeInteger(maxUnits) || maxUnits < 1) {
    throw new RangeError(`maxUnits must be a positive integer, but was ${maxUnits}.`);
  }
}

interface DurationComponent {
  count: number;
  unit: TimeUnit;
}
