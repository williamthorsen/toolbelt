/* eslint @typescript-eslint/no-extraneous-class: off */
/* eslint @typescript-eslint/consistent-type-assertions: off */

/**
 * Type-safe replacement for `Object` class methods.
 *
 * @source Soulforge
 *
 * @category Object
 * @experimental
 * @stage strawman
 */
export class TypedObject {
  /**
   * Type-safe replacement for `Object.entries` class methods.
   * For use with object literals and class instances.
   * Classes, functions & null-prototype objects are not supported, and an error will be thrown if one is passed.
   * Because TypeScript's conditional types do not work with numeric keys coerced to strings,
   * this function rejects objects with numeric keys at compile-time (although it would succeed at runtime).
   * For these use cases without type safety, use `Object.entries` instead.
   */
  static entries(input: string): [string, string][];
  static entries<T extends ReadonlyArray<unknown>>(input: T): [string, T extends ReadonlyArray<infer U> ? U : never][];
  static entries<T extends object>(input: NoNumericKeys<T>): [keyof StringFields<T>, ValueOf<StringFields<T>>][];
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static entries<T extends object | string>(input: T) {
    if (typeof input === 'string') {
      return Object.entries(input);
    }
    if (typeof input === 'function') {
      throw new TypeError('Method does not support functions. Use Object.entries instead.');
    }
    if (Array.isArray(input)) {
      return Object.entries(input) as [string, T extends Array<infer U> ? U : never][];
    }
    if (Object.getPrototypeOf(input) === null) {
      // TypeScript cannot infer the type of an object with no prototype, so disallow this use.
      throw new Error('Method does not support objects with no prototype. Use Object.entries instead.');
    }
    return Object.entries(input) as [keyof StringFields<T>, ValueOf<StringFields<T>>][];
  }

  static fromEntries<K extends PropertyKey, V>(entries: Iterable<readonly [K, V]>): Record<K, V> {
    return Object.fromEntries(entries) as Record<K, V>;
  }

  protected constructor() {}
}

type ExtractNumericKeys<T> = Extract<keyof T, number>;

export type NoNumericKeys<T> = ExtractNumericKeys<T> extends never ? T : never;

type NonSymbolKeys<T> = { [K in keyof T]: K extends symbol ? never : K }[keyof T];

type StringFields<T> = Pick<T, NonSymbolKeys<T>>;

type ValueOf<T> = T[keyof T];
