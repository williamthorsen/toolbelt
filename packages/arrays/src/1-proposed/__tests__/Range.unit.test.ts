import { describe, expect, it, vi } from 'vitest';

import { Range } from '../Range.ts';

describe(Range, () => {
  describe.each([
    { label: 'an ascending range', start: 1, end: 5, values: [1, 2, 3, 4, 5], outside: [0, 6] },
    { label: 'a descending range', start: 5, end: 1, values: [5, 4, 3, 2, 1], outside: [6, 0] },
    { label: 'a single-value range', start: 7, end: 7, values: [7], outside: [6, 8] },
  ])('given $label', ({ start, end, values, outside }) => {
    const range = new Range(start, end);

    it('has one value per step', () => {
      expect(range).toHaveLength(values.length);
    });

    it('iterates its values in order', () => {
      expect([...range]).toStrictEqual(values);
    });

    it('contains each of its values and neither neighbouring value', () => {
      for (const value of values) expect(range).toContain(value);
      for (const value of outside) expect(range).not.toContain(value);
    });

    it('returns its values in order from toArray', () => {
      expect(range.toArray()).toStrictEqual(values);
    });

    it('reports each of its values as included', () => {
      expect(values.map((value) => range.includes(value))).toStrictEqual(values.map(() => true));
    });

    it('reports the value beyond each bound as excluded', () => {
      expect(outside.map((value) => range.includes(value))).toStrictEqual([false, false]);
    });

    it('passes each value, its index, and the values to the map callback, in order', () => {
      const callback = vi.fn((value: number) => value * 10);

      expect(range.map(callback)).toStrictEqual(values.map((value) => value * 10));
      expect(callback.mock.calls).toStrictEqual(values.map((value, index) => [value, index, values]));
    });

    it('passes each value, its index, and the values to the forEach callback, in order', () => {
      const callback = vi.fn();

      range.forEach(callback);

      expect(callback.mock.calls).toStrictEqual(values.map((value, index) => [value, index, values]));
    });
  });
});
