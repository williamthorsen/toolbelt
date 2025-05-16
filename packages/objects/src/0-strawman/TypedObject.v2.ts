/* eslint @typescript-eslint/consistent-type-assertions: off */

/**
 * Provides type-safe methods for working with objects.
 *
 * @source Prizereader
 *
 * @category Object
 * @experimental
 * @stage strawman
 */
export const TypedObject = {
  /**
   * Returns an array of key-value pairs from the given object.
   * Because `Object.entries` converts all keys to strings, only objects with string keys are accepted by this method.
   */
  entries<T extends StringKeyed<T>>(obj: T): [keyof T, T[keyof T]][] {
    return Object.entries(obj) as [keyof T, T[keyof T]][];
  },

  /**
   * Returns an array of keys from the given object.
   * Because `Object.keys` converts all keys to strings, only objects with string keys are accepted by this method.
   */
  keys<T extends StringKeyed<T>>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
  },
};

type StringKeyed<T> = {
  [K in keyof T]: K extends string ? T[K] : never;
};
