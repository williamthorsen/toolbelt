import { describe, expect, it } from 'vitest';

import { assertIsPlainObject, isPlainObject } from '../isPlainObject.js';

describe('assertIsPlainObject() | isPlainObject()', () => {
  it('if value is a plain object, does not throw an error | returns true', () => {
    const value = {};

    expect(isPlainObject(value)).toBe(true);
    expect(
      () => isPlainObject(value)
    ).not.toThrow();
  });

  it('if the value is a class instance, throws an error | returns false', () => {
    // Class instances are instances of `Object` but are not plain objects
    const value = new Date();

    expect(isPlainObject(value)).toBe(false);
    expect(
      () => assertIsPlainObject(value)
    ).toThrow();
  });

  it.each([[1, 2], () => true])('if value is an array or function, throws an error | returns false', (value) => {
    // Arrays and functions are instances of `Object` but are not plain objects
    expect(isPlainObject(value)).toBe(false);
    expect(
      () => assertIsPlainObject(value)
    ).toThrow();
  });

  it('if value is null, throws an error | returns false', () => {
    // `null` is of type `object` but is not a plain object
    const value = null;

    expect(isPlainObject(value)).toBe(false);
    expect(
      () => assertIsPlainObject(value)
    ).toThrow();
  });

  it.each([true, 0, '""', undefined])('if value is a boolean, number, string, or undefined such as %s, throws an error | returns false', (value) => {
    expect(isPlainObject(value)).toBe(false);
    expect(
      () => assertIsPlainObject(value)
    ).toThrow();
  });

  it('if value is a symbol, throws an error | returns false', () => {
    const value = Symbol('any-symbol');

    expect(isPlainObject(value)).toBe(false);
    expect(
      () => assertIsPlainObject(value)
    ).toThrow();
  });
});
