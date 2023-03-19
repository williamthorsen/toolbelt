export function assertIsPlainObject(value: unknown): asserts value is PlainObject {
  if (!isPlainObject(value)) {
    throw new Error('Value is not a plain object');
  }
}

/**
 * Returns true if the value is a "plain" object -- i.e., an object containing zero or more key-value pairs, and not
 * some other type of JavaScript object such as a function, class instance, null, or array.
 */
export function isPlainObject(value: unknown): value is PlainObject {
  return value instanceof Object && Object.getPrototypeOf(value) === Object.prototype;
}

export type PlainObject = { [key: string]: unknown } & ({ bind?: never } | { call?: never });
