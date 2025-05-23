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
 * If the input does not represent a valid integer, returns the fallback value.
 *
 * @param value - The string to parse.
 * @param fallbackValue - The value to return if parsing fails.
 * @returns The parsed integer or the fallback value.
 *
 * @category Type Guards
 * @experimental
 * @stage candidate
 */
export function safeParseInteger(value: Maybe<string>, fallbackValue: number): number;
export function safeParseInteger(value: Maybe<string>, fallbackValue?: undefined): number | undefined;
export function safeParseInteger(
  value: Maybe<string>,
  fallbackValue: number | undefined = undefined,
): number | undefined {
  if (!isIntegerString(value)) {
    return fallbackValue;
  }

  return Number.parseInt(value.trim(), 10);
}

type Maybe<T> = T | null | undefined;
