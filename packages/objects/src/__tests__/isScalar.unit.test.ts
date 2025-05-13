import { describe, expect, it, vi } from 'vitest';

import { isScalar } from '../isScalar.js';
import { nonscalars, scalars } from './primitives.fixture.js';

describe(isScalar, () => {
  describe('nonscalars', () => {
    for (const [label, value] of nonscalars) {
      it(`returns false for ${label}`, () => {
        expect(isScalar(value)).toBe(false);
      });
    }

    it('returns false for a function', () => {
      expect(isScalar(vi.fn)).toBe(false);
    });
  });

  describe('scalars', () => {
    it('returns true for null', () => {
      expect(isScalar(null)).toBe(true);
    });

    for (const [label, value] of scalars) {
      it(`returns true for ${label}`, () => {
        expect(isScalar(value)).toBe(true);
      });
    }
  });
});
