import type { Integer } from './numbers.types.ts';

/**
 * Scales a number from one range to another.
 */
export function scale(value: number, toRange: Range, fromRange: Partial<Range> = {}): number {
  const { min: toMin, max: toMax } = toRange;
  const { min: fromMin = 0, max: fromMax = 1 } = fromRange;

  const fromMagnitude = fromMax - fromMin;
  const toMagnitude = toMax - toMin;

  const offset = value - fromMin;

  return toMin + (offset * toMagnitude) / fromMagnitude;
}

export function scaleInt(value: number, toRange: Range, fromRange: Partial<IntegerRange> = {}): Integer {
  if (isNonInteger(toRange.min) || isNonInteger(toRange.max)) {
    throw new RangeError('Invalid range: min and max must be integers.');
  }
  const scaled = scale(value, toRange, fromRange);
  return Math.round(scaled);
}

function isNonInteger(num: number | undefined): boolean {
  return num !== undefined && !Number.isInteger(num);
}

interface Range {
  min: number;
  max: number;
}

interface IntegerRange {
  min: Integer;
  max: Integer;
}
