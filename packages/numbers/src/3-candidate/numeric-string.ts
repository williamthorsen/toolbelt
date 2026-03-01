import type { Maybe } from '../internal/internal.types.ts';

/**
 * Returns true if the value is a string that represents a valid finite number.
 *
 * Accepts integers, decimals, and scientific notation (e.g., "1e3").
 *
 * @category Type Guards
 * @experimental
 * @stage candidate
 */
export function isNumericString(value: string | null | undefined): value is string {
  if (value === null || value === undefined) {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return false;
  }

  const num = Number(trimmed);
  return Number.isFinite(num);
}
/**
 * Attempts to parse a number from a string and returns the parsed number.
 * If the input does not represent a valid number, returns the fallback value or throws the fallback error.
 *
 * @param value - The string to parse.
 * @param fallback - The value to return if parsing fails.
 * @returns The parsed number or the fallback value.
 *
 * @category Type Guards
 * @experimental
 * @stage candidate
 */
export function safeParseNumber(value: Maybe<string>, fallback: number | Error): number;
export function safeParseNumber(value: Maybe<string>, fallback?: undefined): number | undefined;
export function safeParseNumber(value: Maybe<string>, fallback?: number | Error): number | undefined {
  if (!isNumericString(value)) {
    if (fallback instanceof Error) throw fallback;
    return fallback;
  }

  return Number(value.trim());
}
