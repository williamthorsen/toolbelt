function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse a JSON string and return the result if it is a plain object (Record<string, unknown>).
 * Returns `undefined` if parsing fails or the result is not a plain object.
 */
export function parseJsonRecord(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    // Invalid JSON
  }
  return undefined;
}
