/**
 * Returns true if the given value is a plain object, i.e., a value that
 * - is an object created with the `Object` constructor or with the object literal syntax
 * - is not a function, class instance, null, or array
 *
 * @stage release
 */
export function isPlainObject(value: unknown): value is PlainObject {
  return value instanceof Object && Object.getPrototypeOf(value) === Object.prototype;
}

export type PlainObject = { [key: string]: unknown } & ({ bind?: never } | { call?: never });
