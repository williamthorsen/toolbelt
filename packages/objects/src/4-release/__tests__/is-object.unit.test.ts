import { nonscalars, scalars } from '../../internal/primitives.fixture.ts';
import { isObject } from '../is-object.ts';

describe('isObject()', () => {
  describe('nonscalars', () => {
    for (const [label, value] of nonscalars) {
      it(`returns true for ${label}`, () => {
        assertEquals(isObject(value), true);
      });
    }

    it(`returns false for a function`, () => {
      const value = () => {};
      assertEquals(isObject(value), false);
    });
  });

  describe('scalars', () => {
    it(`returns false for null`, () => {
      assertEquals(isObject(null), false);
    });

    for (const [label, value] of scalars) {
      it(`returns false for ${label}`, () => {
        assertEquals(isObject(value), false);
      });
    }
  });
});
