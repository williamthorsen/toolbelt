import { testIntegerString } from '../internal/testIntegerString.ts';

/**
 * Returns true if the value is a string that represents a valid integer.
 *
 * @category Type Guards
 * @experimental
 * @stage candidate
 */
export function isIntegerString(value: string | null | undefined): value is string {
  return testIntegerString(value);
}
