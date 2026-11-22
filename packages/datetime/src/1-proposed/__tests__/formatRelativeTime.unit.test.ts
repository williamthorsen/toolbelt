import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from '../formatRelativeTime.ts';

const NOW = Date.parse('2026-11-22T12:00:00.000Z');

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe(formatRelativeTime, () => {
  describe('unit selection', () => {
    it.each([
      { offset: 0, past: 'now', future: 'now' },
      { offset: 1 * SECOND, past: '1 second ago', future: 'in 1 second' },
      { offset: 59 * SECOND, past: '59 seconds ago', future: 'in 59 seconds' },
      { offset: 1 * MINUTE, past: '1 minute ago', future: 'in 1 minute' },
      { offset: 59 * MINUTE, past: '59 minutes ago', future: 'in 59 minutes' },
      { offset: 1 * HOUR, past: '1 hour ago', future: 'in 1 hour' },
      { offset: 23 * HOUR, past: '23 hours ago', future: 'in 23 hours' },
      { offset: 1 * DAY, past: 'yesterday', future: 'tomorrow' },
      { offset: 3 * DAY, past: '3 days ago', future: 'in 3 days' },
      { offset: 29 * DAY, past: '29 days ago', future: 'in 29 days' },
      { offset: 30 * DAY, past: 'last month', future: 'next month' },
      { offset: 90 * DAY, past: '3 months ago', future: 'in 3 months' },
      { offset: 364 * DAY, past: '12 months ago', future: 'in 12 months' },
      { offset: 365 * DAY, past: 'last year', future: 'next year' },
      { offset: 3 * 365 * DAY, past: '3 years ago', future: 'in 3 years' },
    ])('renders an offset of $offset ms as "$past" and "$future"', ({ offset, past, future }) => {
      expect(formatAt(NOW - offset)).toBe(past);
      expect(formatAt(NOW + offset)).toBe(future);
    });
  });

  describe('truncation', () => {
    it('truncates the count toward zero rather than rounding it', () => {
      expect(formatAt(NOW - 47 * HOUR)).toBe('yesterday');
      expect(formatAt(NOW + 47 * HOUR)).toBe('tomorrow');
    });

    it('renders elapsed time below one second as now, in either direction', () => {
      expect(formatAt(NOW - 999)).toBe('now');
      expect(formatAt(NOW + 999)).toBe('now');
    });
  });

  describe('locale', () => {
    it('formats the text in the given locale', () => {
      const iso = new Date(NOW - DAY).toISOString();

      expect(formatRelativeTime(iso, NOW, { locale: 'de' })).toBe('gestern');
    });
  });

  describe('invalid arguments', () => {
    it('if the time does not resolve to a valid date, throws a RangeError', () => {
      const act = () => formatRelativeTime('not a date', NOW);

      expect(act).toThrow(RangeError);
    });

    it.each([NaN, Infinity])('if now is %s, throws a RangeError', (now) => {
      const act = () => formatRelativeTime('2026-11-22T12:00:00.000Z', now);

      expect(act).toThrow(RangeError);
    });
  });
});

// region | Helpers

function formatAt(millis: number): string {
  return formatRelativeTime(new Date(millis).toISOString(), NOW, { locale: 'en' });
}

// endregion | Helpers
