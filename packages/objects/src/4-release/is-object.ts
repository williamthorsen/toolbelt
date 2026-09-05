/**
 * Returns true if the value is a non-primitive: an object, an array, or a function.
 *
 * @category Object
 * @stage release
 */
export function isObject(value: unknown): value is object {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

/**
 * Returns true if the given value is a plain object, i.e., a value that
 * - has `Object.prototype`, a null prototype, or a prototype whose own prototype is null, which admits another realm's `Object.prototype`
 * - is not a function, class instance, null, or array
 * - has neither `Symbol.toStringTag` nor `Symbol.iterator`, own or inherited
 *
 * @category Object
 * @stage release
 */
export function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  // The symbol lookups walk the prototype chain: The third clause admits a prototype that can carry either.
  return (
    (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) &&
    !Reflect.has(value, Symbol.toStringTag) &&
    !Reflect.has(value, Symbol.iterator)
  );
}

/**
 * Returns true if the value is a non-null object whose properties can be read by key, which admits class and
 * built-in instances but excludes arrays and functions.
 *
 * @category Object
 * @stage release
 */
export function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns true if the value is a keyed container: a record or an array, but not a function.
 *
 * @category Object
 * @stage release
 */
export function isRecordOrArray(value: unknown): value is Record<PropertyKey, unknown> | unknown[] {
  return typeof value === 'object' && value !== null;
}

export type PlainObject = { [key: string]: unknown } & ({ bind?: never } | { call?: never });
