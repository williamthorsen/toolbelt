import { assert } from './assert.ts';

/**
 * Throws an error if the value is null or undefined. Otherwise, does nothing.
 * Narrows the type to exclude null and undefined.
 */
export function assertIsNonNullable<T>(
  value: T | null | undefined,
  error: Error | string = 'Value must not be null or undefined.',
): asserts value is T {
  assert(isNonNullable(value), error);
}

/**
 * Returns true if the value is neither null nor undefined, else false.
 * If true, narrows the type to exclude null and undefined.
 */
export function isNonNullable<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Returns true if the value is null or undefined, else false.
 * If false, narrows the type to exclude null and undefined.
 */
export function isNullable<T>(value: T | null | undefined): value is Exclude<T, null | undefined> {
  return value === null || value === undefined;
}
