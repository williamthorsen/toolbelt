import type { Maybe } from '../internal/internal.types.ts';

/**
 * Returns true if the value is a string that represents a valid integer.
 *
 * @category Type Guards
 * @experimental
 * @stage candidate
 */
export function isIntegerString(value: string | null | undefined): value is string {
  if (value === null || value === undefined) {
    return false;
  }

  return /^-?\d+$/.test(value.trim());
}

/**
 * Attempts to parse an integer from a string and returns the parsed integer.
 * If the input does not represent a valid integer, returns the fallback value or throws the fallback error.
 *
 * @param value - The string to parse.
 * @param fallback - The value to return if parsing fails.
 * @returns The parsed integer or the fallback value.
 *
 * @category Type Guards
 * @experimental
 * @stage candidate
 */
export function safeParseInteger(value: Maybe<string>, fallback: number | Error): number;
export function safeParseInteger(value: Maybe<string>, fallback?: undefined): number | undefined;
export function safeParseInteger(value: Maybe<string>, fallback?: number | Error): number | undefined {
  if (!isIntegerString(value)) {
    if (fallback instanceof Error) {
      throw fallback;
    }
    return fallback;
  }

  return Number.parseInt(value.trim(), 10);
}
