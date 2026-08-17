/**
 * Returns the value constrained to the inclusive bounds; an omitted bound leaves that side unconstrained.
 * A NaN value passes through, but a NaN bound or a min greater than max throws a RangeError.
 *
 * @category Number
 * @experimental
 * @stage candidate
 */
export function clamp(value: number, bounds: ClampBounds): number {
  const { max = Infinity, min = -Infinity } = bounds;

  // Every comparison with NaN is false, so this guard rejects a NaN bound as well as a reversed range.
  if (!(min <= max)) {
    const received = `Received min=${bounds.min}, max=${bounds.max}.`;
    throw new RangeError(`Invalid range: min must be less than or equal to max, and neither can be NaN. ${received}`);
  }

  // Math.max and Math.min preserve signed zero as the TC39 Math.clamp proposal specifies.
  return Math.max(min, Math.min(max, value));
}

export interface ClampBounds {
  readonly max?: number | undefined;
  readonly min?: number | undefined;
}
