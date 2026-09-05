import { isRecord } from './isRecord.ts';

/**
 * Narrows a named field of a payload to an array, which is how every list-bearing Jira response nests its values.
 *
 * @internal
 */
export function readArrayField(payload: unknown, field: string): readonly unknown[] | undefined {
  if (!isRecord(payload)) return undefined;

  const value = payload[field];

  return Array.isArray(value) ? value : undefined;
}
