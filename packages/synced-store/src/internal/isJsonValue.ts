import { isPlainObject } from '@williamthorsen/toolbelt.objects';

import type { JsonValue } from '../1-proposed/types.ts';

/**
 * Returns true if the value survives a JSON round trip unchanged: `null`, a boolean, a finite number, a string, or an
 * array or plain object of such values, without cycles, holes, or `undefined` members.
 *
 * @internal
 */
export function isJsonValue(value: unknown): value is JsonValue {
  return isJsonValueWithin(value, new Set());
}

// region | Helpers
function isJsonValueWithin(value: unknown, ancestors: Set<object>): boolean {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!Array.isArray(value) && !isPlainObject(value)) return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const members: unknown[] = Array.isArray(value) ? Array.from(value) : Object.values(value);
  const isJson = members.every((member) => isJsonValueWithin(member, ancestors));
  ancestors.delete(value);
  return isJson;
}
// endregion | Helpers
