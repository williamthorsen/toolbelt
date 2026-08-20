import { isRecord } from '../4-release/is-object.ts';

/**
 * @internal
 */
export function deepSetsToArrays(value: unknown): unknown {
  // Precedes the record branch, which a Set also satisfies.
  if (value instanceof Set) {
    const asArray = [...value];
    return asArray.map(deepSetsToArrays).toSorted();
  }

  if (Array.isArray(value)) {
    return value.map(deepSetsToArrays);
  }

  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepSetsToArrays(val);
    }
    return result;
  }

  return value;
}
