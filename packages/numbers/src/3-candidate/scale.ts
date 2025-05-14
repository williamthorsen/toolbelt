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

export function scaleInt(value: number, toRange: Range, fromRange: Partial<IntegerRange> = {}): number {
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

/**
 * Represents a range of integers. Non-integer values should be truncated by the called function.
 */
interface IntegerRange {
  min: number;
  max: number;
}
