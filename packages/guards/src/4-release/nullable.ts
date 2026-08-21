import { assert } from './assert.ts';

/**
 * Throws an error if the value is null or undefined. Otherwise, does nothing.
 * Narrows the type to exclude null and undefined.
 *
 * @category Assertions
 * @stage release
 */
export function assertIsNonNullable<T>(
  value: T,
  error: Error | string = 'Value must not be null or undefined.',
): asserts value is NonNullable<T> {
  assert(isNonNullable(value), error);
}

/**
 * Returns true if the value is neither null nor undefined, else false.
 * If true, narrows the type to exclude null and undefined; if false, narrows it to `null | undefined`.
 *
 * @category Type Guards
 * @stage release
 */
export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * Returns true if the value is null or undefined, else false.
 * If true, narrows the type to `null | undefined`; if false, narrows it to exclude null and undefined.
 *
 * @category Type Guards
 * @stage release
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
