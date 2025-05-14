import { describe, expect, it, vi } from 'vitest';

import { scalars } from '../../3-candidate/primitives.fixture.ts';
import { isPlainObject } from '../isPlainObject.ts';

describe('isPlainObject(value: unknown)', () => {
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
