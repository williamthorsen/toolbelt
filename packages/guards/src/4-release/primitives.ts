/**
 * Returns true if the value is a boolean.
 *
 * @category Type Guards
 * @stage release
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Returns true if the value is a number but not `NaN` (which is technically a number).
 * `Infinity` and `-Infinity` are numbers.
 *
 * @category Type Guards
 * @stage release
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Returns true if the value is a string.
 *
 * @category Type Guards
 * @stage release
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
