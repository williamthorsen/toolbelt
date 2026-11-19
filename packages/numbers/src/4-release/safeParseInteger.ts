import type { Maybe } from '../internal/internal.types.ts';
import { testIntegerString } from '../internal/testIntegerString.ts';

/**
 * Attempts to parse an integer from a string and returns the parsed integer.
 * If the input does not represent a valid integer, returns the fallback value or throws the fallback error.
 *
 * @param value - The string to parse.
 * @param fallback - The value to return if parsing fails.
 * @returns The parsed integer or the fallback value.
 *
 * @category Type Guards
 * @stage release
 */
export function safeParseInteger(value: Maybe<string>, fallback: number | Error): number;
export function safeParseInteger(value: Maybe<string>, fallback?: undefined): number | undefined;
export function safeParseInteger(value: Maybe<string>, fallback?: number | Error): number | undefined {
  if (!testIntegerString(value)) {
    // rdy-ignore-next-line toolbelt.errors/no-instanceof-error -- a caller-supplied argument, not a caught value
    if (fallback instanceof Error) {
      throw fallback;
    }
    return fallback;
  }

  return Number.parseInt(value.trim(), 10);
}
