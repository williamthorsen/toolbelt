// Both reduced terms are below the span, so their sum stays below 2^53 and therefore exact.
const MAX_EXACT_SPAN = 2 ** 52;

/**
 * Returns the value at the given position of the inclusive range from `min` (default 0) to `max`, counting from `min`
 * and cycling past `max`, after rotating the position by `offset`. A negative index or offset counts back from the top
 * of the range, as a floored modulo does. `maxSpan` caps the number of values that the range may span; it defaults to
 * 2^52, the widest span over which the arithmetic is exact. Throws a RangeError if `maxSpan` is not a safe integer from
 * 1 to 2^52, if a bound or the offset is not a safe integer, if min exceeds max, if the range spans more than `maxSpan`
 * values, or if the index is not an integer.
 *
 * @category Number
 * @experimental
 * @stage candidate
 */
export function indexIntoRange(index: number, range: IndexRange): number {
  const { max, maxSpan = MAX_EXACT_SPAN, min = 0, offset = 0 } = range;

  // Validate the span cap, the bounds, the offset, and the index
  if (!Number.isSafeInteger(maxSpan) || maxSpan < 1 || maxSpan > MAX_EXACT_SPAN) {
    throw new RangeError(`Invalid span: maxSpan must be a safe integer from 1 to 2^52. Received ${maxSpan}.`);
  }
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new RangeError(`Invalid range: min and max must be safe integers. Received min=${min}, max=${max}.`);
  }
  if (min > max) {
    throw new RangeError(`Invalid range: min must be less than or equal to max. Received min=${min}, max=${max}.`);
  }
  if (!Number.isSafeInteger(offset)) {
    throw new RangeError(`Invalid offset: offset must be a safe integer. Received ${offset}.`);
  }

  const size = max - min + 1;
  if (size > maxSpan) {
    const received = `Received min=${min}, max=${max}.`;
    throw new RangeError(`Invalid range: The range cannot span more than ${maxSpan} values. ${received}`);
  }
  // eslint-disable-next-line unicorn/prefer-number-is-safe-integer -- `%` reduces an unsafe integer index exactly.
  if (!Number.isInteger(index)) {
    throw new RangeError(`Invalid index: index must be an integer. Received ${index}.`);
  }

  return min + ((reduceModulo(index, size) + reduceModulo(offset, size)) % size);
}

export interface IndexRange {
  readonly max: number;
  readonly maxSpan?: number | undefined;
  readonly min?: number | undefined;
  readonly offset?: number | undefined;
}

// region | Helpers

/** Returns the floored modulo, which, unlike `%`, is never negative for a positive divisor. */
function reduceModulo(dividend: number, divisor: number): number {
  return ((dividend % divisor) + divisor) % divisor;
}

// endregion | Helpers
