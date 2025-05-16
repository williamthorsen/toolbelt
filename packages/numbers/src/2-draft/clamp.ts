interface ClampParams {
  min?: number;
  max?: number;
}

/**
 * Returns a number constrained to the minimum and maximum values.
 */
export function clamp(value: number, { min, max }: ClampParams): number {
  if (min !== undefined && max !== undefined && min > max) {
    throw new RangeError('Minimum value cannot be greater than maximum value');
  }

  const minValue = min ?? Number.NEGATIVE_INFINITY;
  const maxValue = max ?? Number.POSITIVE_INFINITY;

  return Math.max(minValue, Math.min(maxValue, value));
}
