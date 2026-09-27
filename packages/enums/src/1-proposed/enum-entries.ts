/**
 * Lists an enum's members as `[name, value]` pairs.
 *
 * @category Enum
 * @experimental
 * @stage proposed
 */
export function enumEntries<T extends Record<string, string | number>>(
  enumObj: T,
): [Extract<keyof T, string>, T[Extract<keyof T, string>]][] {
  return enumKeys(enumObj).map((key) => [key, enumObj[key]]);
}

/**
 * Lists an enum's member names, skipping the numeric keys of the reverse mapping that a numeric enum adds.
 *
 * @category Enum
 * @experimental
 * @stage proposed
 */
export function enumKeys<T extends Record<string, string | number>>(enumObj: T): Extract<keyof T, string>[] {
  return Object.keys(enumObj).filter((key): key is Extract<keyof T, string> => Number.isNaN(Number(key)));
}

/**
 * Lists an enum's member values.
 *
 * @category Enum
 * @experimental
 * @stage proposed
 */
export function enumValues<T extends Record<string, string | number>>(enumObj: T): T[Extract<keyof T, string>][] {
  return enumKeys(enumObj).map((key) => enumObj[key]);
}
