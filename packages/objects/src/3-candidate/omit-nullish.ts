/**
 * Given an object, returns an object with the same keys, omitting any keys whose values are null or undefined.
 */
export function omitNullish<T extends object>(obj: NotArray<T>): NonNullishProperties<T> {
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key as keyof T] !== null && obj[key as keyof T] !== undefined) {
      acc[key as keyof T] = obj[key as keyof T];
    }
    return acc;
  }, {} as T);
}

/**
 * Given an object, returns an object with the same keys, omitting any keys whose values are undefined.
 */
export function omitUndefined<T extends object>(obj: NotArray<T>): DefinedProperties<T> {
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key as keyof T] !== undefined) {
      acc[key as keyof T] = obj[key as keyof T];
    }
    return acc;
  }, {} as T);
}

export type DefinedProperties<T> = Pick<T, NonNeverKeys<T> & NonUndefinedKeys<T>>;

// region | Types
type IfNullish<T, Y, N> = [null, undefined] extends [T] ? Y : N;
type IfNever<T, Y, N> = [T] extends [never] ? Y : N;
type NonNeverKeys<T> = { [K in keyof T]: IfNever<T[K], never, K> }[keyof T];
type NonNullishKeys<T> = { [K in keyof T]: IfNullish<T[K], never, K> }[keyof T];
type NonUndefinedKeys<T> = { [K in keyof T]: IfUndefined<T[K], never, K> }[keyof T];
type NotArray<T> = T extends Array<unknown> ? never : T;

export type NonNullishProperties<T> = Pick<T, NonNeverKeys<T> & NonNullishKeys<T>>;
// endregion | Types
