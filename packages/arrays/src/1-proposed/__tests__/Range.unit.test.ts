import { describe, expect, it } from 'vitest';

import { Range } from '../Range.ts';

describe(Range, () => {
  describe('ascending ranges', () => {
    const range = new Range({ start: 1, end: 5 });

    it('has correct length', () => {
      expect(range).toHaveLength(5);
    });

    it('includes values within range', () => {
      expect(range).toContain(1);
      expect(range).toContain(3);
      expect(range).toContain(5);
    });

    it('excludes values outside range', () => {
      expect(range).not.toContain(0);
      expect(range).not.toContain(6);
    });

    it('toArray returns expected values', () => {
      expect(range.toArray()).toStrictEqual([1, 2, 3, 4, 5]);
    });

    it('is iterable with correct order', () => {
      expect([...range]).toStrictEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('descending ranges', () => {
    const range = new Range({ start: 5, end: 1 });

    it('has correct length', () => {
      expect(range).toHaveLength(5);
    });

    it('includes values within range', () => {
      expect(range).toContain(5);
      expect(range).toContain(3);
      expect(range).toContain(1);
    });

    it('excludes values outside range', () => {
      expect(range).not.toContain(0);
      expect(range).not.toContain(6);
    });

    it('toArray returns expected values', () => {
      expect(range.toArray()).toStrictEqual([5, 4, 3, 2, 1]);
    });

    it('is iterable with correct order', () => {
      expect([...range]).toStrictEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('single-value ranges', () => {
    const range = new Range({ start: 7, end: 7 });

    it('has length 1', () => {
      expect(range).toHaveLength(1);
    });

    it('includes only that value', () => {
      expect(range).toContain(7);
      expect(range).not.toContain(6);
      expect(range).not.toContain(8);
    });

    it('toArray returns that single value', () => {
      expect(range.toArray()).toStrictEqual([7]);
    });

    it('is iterable with that value', () => {
      expect([...range]).toStrictEqual([7]);
    });
  });
});
