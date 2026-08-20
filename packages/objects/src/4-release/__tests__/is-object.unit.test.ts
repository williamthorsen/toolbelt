import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { nonscalars, scalars } from '../../test-utils/scalars.ts';
import { isObject, isPlainObject, isRecord, isRecordOrArray } from '../is-object.ts';

describe(isObject, () => {
  describe('nonscalars', () => {
    it.each(nonscalars)('returns true for $label', ({ value }) => {
      expect(isObject(value)).toBe(true);
    });

    it(`returns true for a function`, () => {
      const value = () => {};
      expect(isObject(value)).toBe(true);
    });
  });

  describe('scalars', () => {
    it(`returns false for null`, () => {
      expect(isObject(null)).toBe(false);
    });

    it.each(scalars)('returns false for $label', ({ value }) => {
      expect(isObject(value)).toBe(false);
    });
  });

  it('narrows to object', () => {
    expectTypeOf(isObject).guards.toEqualTypeOf<object>();
  });
});

describe(isPlainObject, () => {
  describe('nonscalars', () => {
    it('returns true for an object literal', () => {
      const plainObjects = [{}, { a: 1 }];
      for (const plainObject of plainObjects) {
        expect(isPlainObject(plainObject)).toBe(true);
      }
    });

    it('returns true for an object created using the Object constructor', () => {
      const value = new Object();
      expect(isPlainObject(value)).toBe(true);
    });

    it('returns true for an object with a null prototype', () => {
      expect(isPlainObject(Object.create(null))).toBe(true);
    });

    it('returns true for the result of Object.groupBy, whose prototype is null', () => {
      expect(isPlainObject(Object.groupBy([1], () => 'key'))).toBe(true);
    });

    it('returns false for an array', () => {
      expect(isPlainObject([])).toBe(false);
    });

    it(`returns false for a function`, () => {
      expect(isPlainObject(vi.fn)).toBe(false);
    });

    it('returns false for an instance of any class other than Object', () => {
      class MyClass {
        constructor(public prop?: unknown) {}
      }

      const instances = [
        new Date(), //
        new Map(),
        new MyClass(),
        new Set(),
        new WeakMap(),
      ];
      for (const instance of instances) {
        expect(isPlainObject(instance)).toBe(false);
      }
    });

    it('returns false for an object carrying Symbol.toStringTag or Symbol.iterator', () => {
      expect(isPlainObject({ [Symbol.toStringTag]: 'Tagged' })).toBe(false);
      expect(isPlainObject({ [Symbol.iterator]: () => [].values() })).toBe(false);
    });

    // The prototype-whose-prototype-is-null clause admits an arbitrary object, so the symbol lookups must
    // reach the whole chain rather than own properties alone.
    it('returns false when either symbol is inherited from a null-prototype prototype', () => {
      const taggedProto: object = Object.assign(Object.create(null), { [Symbol.toStringTag]: 'Tagged' });
      const iterableProto: object = Object.assign(Object.create(null), { [Symbol.iterator]: () => [].values() });

      expect(isPlainObject(Object.create(taggedProto))).toBe(false);
      expect(isPlainObject(Object.create(iterableProto))).toBe(false);
    });

    it('returns true for an object whose prototype is a bare null-prototype object', () => {
      const bareProto: object = Object.create(null);

      expect(isPlainObject(Object.create(bareProto))).toBe(true);
    });
  });

  describe('scalars', () => {
    it(`returns false for null`, () => {
      expect(isPlainObject(null)).toBe(false);
    });

    it.each(scalars)('returns false for $label', ({ value }) => {
      expect(isPlainObject(value)).toBe(false);
    });
  });
});

describe(isRecord, () => {
  describe('nonscalars', () => {
    it('returns true for an object literal', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ a: 1 })).toBe(true);
    });

    it('returns true for a class or built-in instance', () => {
      class MyClass {}

      const instances = [
        new Date(), //
        new Map(),
        new MyClass(),
        new Set(),
        new WeakMap(),
      ];
      for (const instance of instances) {
        expect(isRecord(instance)).toBe(true);
      }
    });

    it('returns false for an array', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it(`returns false for a function`, () => {
      expect(isRecord(vi.fn)).toBe(false);
    });
  });

  describe('scalars', () => {
    it(`returns false for null`, () => {
      expect(isRecord(null)).toBe(false);
    });

    it.each(scalars)('returns false for $label', ({ value }) => {
      expect(isRecord(value)).toBe(false);
    });
  });

  it('narrows to a type whose properties are readable by key', () => {
    expectTypeOf(isRecord).guards.toEqualTypeOf<Record<PropertyKey, unknown>>();
  });
});

describe(isRecordOrArray, () => {
  describe('nonscalars', () => {
    it.each(nonscalars)('returns true for $label', ({ value }) => {
      expect(isRecordOrArray(value)).toBe(true);
    });

    it(`returns false for a function`, () => {
      const value = () => {};
      expect(isRecordOrArray(value)).toBe(false);
    });
  });

  describe('scalars', () => {
    it(`returns false for null`, () => {
      expect(isRecordOrArray(null)).toBe(false);
    });

    it.each(scalars)('returns false for $label', ({ value }) => {
      expect(isRecordOrArray(value)).toBe(false);
    });
  });

  it.each([
    { label: 'an object literal', value: {}, expected: true },
    { label: 'an array', value: [], expected: true },
    { label: 'a built-in instance', value: new Date(), expected: true },
    { label: 'an object with a null prototype', value: Object.create(null), expected: true },
    { label: 'a function', value: () => {}, expected: false },
    { label: 'null', value: null, expected: false },
    { label: 'undefined', value: undefined, expected: false },
    { label: 'a string', value: 'a', expected: false },
  ])('answers $expected for $label', ({ value, expected }) => {
    expect(isRecordOrArray(value)).toBe(expected);
  });

  it('narrows to a record or an array', () => {
    expectTypeOf(isRecordOrArray).guards.toEqualTypeOf<Record<PropertyKey, unknown> | unknown[]>();
  });
});
