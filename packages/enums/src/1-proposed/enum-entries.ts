export function enumEntries<T extends Record<string, string | number>>(
  enumObj: T,
): [Extract<keyof T, string>, T[Extract<keyof T, string>]][] {
  return enumKeys(enumObj).map((key) => [key, enumObj[key]]);
}

export function enumKeys<T extends Record<string, string | number>>(enumObj: T): Extract<keyof T, string>[] {
  return Object.keys(enumObj).filter((key): key is Extract<keyof T, string> => Number.isNaN(Number(key)));
}

export function enumValues<T extends Record<string, string | number>>(enumObj: T): T[Extract<keyof T, string>][] {
  return enumKeys(enumObj).map((key) => enumObj[key]);
}
