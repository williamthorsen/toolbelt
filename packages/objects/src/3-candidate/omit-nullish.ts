/**
 * Returns a copy of the object without the keys whose values are null or undefined.
 *
 * @category Object
 * @experimental
 * @stage candidate
 */
export function omitNullish<T extends object>(obj: NotArray<T>): NonNullishProperties<T> {
  const entries: Array<[string, unknown]> = Object.entries(obj);
  // The copy holds exactly the string-keyed own enumerable properties of `obj` whose values are neither null nor
  // undefined, which TypeScript cannot infer from `Object.fromEntries`.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Object.fromEntries(
    entries.filter(([, value]) => value !== null && value !== undefined),
  ) as NonNullishProperties<T>;
}

/**
 * Returns a copy of the object without the keys whose values are undefined.
 *
 * @category Object
 * @experimental
 * @stage candidate
 */
export function omitUndefined<T extends object>(obj: NotArray<T>): DefinedProperties<T> {
  const entries: Array<[string, unknown]> = Object.entries(obj);
  // The copy holds exactly the string-keyed own enumerable properties of `obj` whose values are not undefined, which
  // TypeScript cannot infer from `Object.fromEntries`.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined)) as DefinedProperties<T>;
}

export type DefinedProperties<T> = Pick<T, NonNeverKeys<T> & NonUndefinedKeys<T>>;

// region | Types
type IfNullish<T, Y, N> = [null, undefined] extends [T] ? Y : N;
type IfNever<T, Y, N> = [T] extends [never] ? Y : N;
type IfUndefined<T, Y, N> = [undefined] extends [T] ? Y : N;
type NonNeverKeys<T> = { [K in keyof T]: IfNever<T[K], never, K> }[keyof T];
type NonNullishKeys<T> = { [K in keyof T]: IfNullish<T[K], never, K> }[keyof T];
type NonUndefinedKeys<T> = { [K in keyof T]: IfUndefined<T[K], never, K> }[keyof T];
type NotArray<T> = T extends Array<unknown> ? never : T;

export type NonNullishProperties<T> = Pick<T, NonNeverKeys<T> & NonNullishKeys<T>>;
// endregion | Types
