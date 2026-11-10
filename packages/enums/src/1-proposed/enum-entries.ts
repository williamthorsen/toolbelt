import { isReverseMappingKey } from '../internal/isReverseMappingKey.ts';

/**
 * Lists an enum's members as `[name, value]` pairs.
 *
 * @category Enum
 * @experimental
 * @stage proposed
 */
export function listEnumEntries<T extends Record<string, string | number>>(
  enumObj: T,
): [Extract<keyof T, string>, T[Extract<keyof T, string>]][] {
  return listEnumKeys(enumObj).map((key) => [key, enumObj[key]]);
}

/**
 * Lists an enum's member names, skipping the keys of the reverse mapping that a numeric enum adds.
 *
 * @category Enum
 * @experimental
 * @stage proposed
 */
export function listEnumKeys<T extends Record<string, string | number>>(enumObj: T): Extract<keyof T, string>[] {
  return Object.keys(enumObj).filter((key): key is Extract<keyof T, string> => !isReverseMappingKey(enumObj, key));
}

/**
 * Lists an enum's member values.
 *
 * @category Enum
 * @experimental
 * @stage proposed
 */
export function listEnumValues<T extends Record<string, string | number>>(enumObj: T): T[Extract<keyof T, string>][] {
  return listEnumKeys(enumObj).map((key) => enumObj[key]);
}
