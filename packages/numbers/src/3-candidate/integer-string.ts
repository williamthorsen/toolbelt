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
 * Safely parse an integer from a string, returning undefined if the input does not represent a valid integer.
 *
 * @category Type Guards
 * @experimental
 * @stage candidate
 */
export function safeParseInteger(value: string | null | undefined): number | undefined {
  if (!isIntegerString(value)) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsedValue) ? undefined : parsedValue;
}
