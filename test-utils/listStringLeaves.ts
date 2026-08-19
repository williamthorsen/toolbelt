import { isRecord } from './isRecord.ts';

/** Collects every string held by a value, descending through the objects and arrays that hold it. */
export function listStringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (isRecord(value)) return Object.values(value).flatMap((nested) => listStringLeaves(nested));
  if (isUnknownArray(value)) return value.flatMap((nested) => listStringLeaves(nested));

  return [];
}

// region | Helpers

/** Reports whether a value is an array, narrowing its elements to `unknown` rather than `any`. */
function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

// endregion | Helpers
