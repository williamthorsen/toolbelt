import { describe, expect, it, vi } from 'vitest';

import { nonscalars, scalars } from '../../internal/primitives.fixture.ts';
import { isObject, isPlainObject } from '../is-object.ts';

describe(isObject, () => {
  describe('nonscalars', () => {
    it.each(nonscalars)('returns true for $label', ({ value }) => {
      expect(isObject(value)).toBe(true);
    });

    it(`returns false for a function`, () => {
      const value = () => {};
      expect(isObject(value)).toBe(false);
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
