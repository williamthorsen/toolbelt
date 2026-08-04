import { describe, expect, it } from 'vitest';

import { formatDuration } from '../formatDuration.ts';

describe(formatDuration, () => {
  describe('unit selection', () => {
    it.each([
      { milliseconds: 0, expected: '0ms' },
      { milliseconds: 1, expected: '1ms' },
      { milliseconds: 999, expected: '999ms' },
      { milliseconds: 1000, expected: '1s' },
      { milliseconds: 59_000, expected: '59s' },
      { milliseconds: 60_000, expected: '1m' },
      { milliseconds: 3_600_000, expected: '1h' },
      { milliseconds: 86_400_000, expected: '1d' },
    ])('renders $milliseconds ms as $expected', ({ milliseconds, expected }) => {
      expect(formatDuration(milliseconds)).toBe(expected);
    });

    it('if the duration is shorter than a millisecond, renders it as zero milliseconds', () => {
      expect(formatDuration(0.4)).toBe('0ms');
    });

    it('renders a duration of many days without reaching for a coarser unit', () => {
      expect(formatDuration(864_000_000)).toBe('10d');
    });
  });

  describe('rounding', () => {
    it('rounds at the only unit shown', () => {
      expect(formatDuration(1500)).toBe('2s');
    });

    it('rounds at the finest unit shown, leaving the coarser ones exact', () => {
      expect(formatDuration(250_300, { maxUnits: 2 })).toBe('4m 10s');
    });

    it('rounds exactly once, rather than once per unit boundary crossed', () => {
      // Rounding to seconds first and to minutes second would report 2m: 89.999s rounds to 90s,
      // which rounds to 2m. Rounding the original once gives 1.49998 minutes, which is 1m.
      expect(formatDuration(89_999)).toBe('1m');
    });

    it.each([
      { milliseconds: 59_900, expected: '1m' },
      { milliseconds: 3_599_999, expected: '1h' },
      { milliseconds: 86_399_999, expected: '1d' },
    ])('if rounding carries past a boundary, promotes $milliseconds ms to $expected', ({ milliseconds, expected }) => {
      expect(formatDuration(milliseconds)).toBe(expected);
    });

    it('if rounding carries with several units shown, promotes the leading unit', () => {
      expect(formatDuration(3_599_999, { maxUnits: 2 })).toBe('1h');
    });

    it('if rounding cannot carry because milliseconds are shown, leaves the leading unit alone', () => {
      expect(formatDuration(59_999, { maxUnits: 2 })).toBe('59s 999ms');
    });
  });

  describe('maxUnits', () => {
    it('defaults to the coarsest unit alone', () => {
      expect(formatDuration(250_300)).toBe('4m');
    });

    it('renders every unit down to the requested depth', () => {
      expect(formatDuration(250_300, { maxUnits: 3 })).toBe('4m 10s 300ms');
    });

    it('omits a trailing zero component rather than padding to the requested depth', () => {
      expect(formatDuration(240_000, { maxUnits: 3 })).toBe('4m');
    });

    it('omits a zero component between two non-zero ones', () => {
      expect(formatDuration(3_601_000, { maxUnits: 3 })).toBe('1h 1s');
    });

    it('if the requested depth runs past the finest unit, stops at milliseconds', () => {
      expect(formatDuration(1, { maxUnits: 5 })).toBe('1ms');
    });

    it('renders every unit at once', () => {
      const milliseconds = 86_400_000 + 3_600_000 + 60_000 + 1000 + 1;

      expect(formatDuration(milliseconds, { maxUnits: 5 })).toBe('1d 1h 1m 1s 1ms');
    });
  });

  describe('invalid arguments', () => {
    it.each([
      { label: 'a negative duration', act: () => formatDuration(-1) },
      { label: 'a NaN duration', act: () => formatDuration(Number.NaN) },
      { label: 'an infinite duration', act: () => formatDuration(Number.POSITIVE_INFINITY) },
      { label: 'a zero maxUnits', act: () => formatDuration(1000, { maxUnits: 0 }) },
      { label: 'a negative maxUnits', act: () => formatDuration(1000, { maxUnits: -1 }) },
      { label: 'a fractional maxUnits', act: () => formatDuration(1000, { maxUnits: 1.5 }) },
    ])('throws a RangeError for $label', ({ act }) => {
      expect(act).toThrow(RangeError);
    });

    it('accepts a fractional duration', () => {
      expect(formatDuration(1500.7, { maxUnits: 2 })).toBe('1s 501ms');
    });
  });
});
