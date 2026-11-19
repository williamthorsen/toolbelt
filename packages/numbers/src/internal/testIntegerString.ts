import type { Maybe } from './internal.types.ts';

/**
 * Returns true if the value is a string that represents a valid integer, ignoring surrounding whitespace.
 *
 * @internal
 */
export function testIntegerString(value: Maybe<string>): value is string {
  if (value === null || value === undefined) {
    return false;
  }

  return /^-?\d+$/.test(value.trim());
}
