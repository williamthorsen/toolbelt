import { isObject } from '../4-release/index.ts';

/**
 * @internal
 */
export function deepSetsToArrays(value: unknown): unknown {
  if (isObject(value)) {
    if (value instanceof Set) {
      const asArray = [...value];
      return asArray.map(deepSetsToArrays).sort();
    }

    if (Array.isArray(value)) {
      return value.map(deepSetsToArrays);
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepSetsToArrays(val);
    }
    return result;
  }

  return value;
}
