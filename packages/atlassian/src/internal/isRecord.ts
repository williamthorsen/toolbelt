/**
 * Reports whether a value is an object whose fields can be read, which is where narrowing a JSON payload starts.
 *
 * @internal
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
