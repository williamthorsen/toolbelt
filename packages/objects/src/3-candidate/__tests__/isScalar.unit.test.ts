import { describe, expect, it, vi } from 'vitest';

import { isScalar } from '../isScalar.ts';
import { nonscalars, scalars } from '../../internal/primitives.fixture.ts';

describe(isScalar, () => {
  describe('nonscalars', () => {
    it.each(nonscalars)('returns false for $label', ({ value }) => {
      expect(isScalar(value)).toBe(false);
    });

    it('returns false for a function', () => {
      expect(isScalar(vi.fn)).toBe(false);
    });
  });

  describe('scalars', () => {
    it('returns true for null', () => {
      expect(isScalar(null)).toBe(true);
    });

    it.each(scalars)('returns true for $label', ({ value }) => {
      expect(isScalar(value)).toBe(true);
    });
  });
});
