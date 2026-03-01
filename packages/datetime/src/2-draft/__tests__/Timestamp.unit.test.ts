import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { Timestamp } from '../Timestamp.ts';
import { TimeUnit } from '../TimeUnit.ts';

const isoDateTime = '2023-01-02T13:45:01.234Z';

describe(Timestamp, () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-15')); // Any fixed date will do.
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('static fromMilliseconds()', () => {
    it('returns a Timestamp initialized with given milliseconds', () => {
      const result = Timestamp.fromMillis(1000);

      expect(result.millis).toBe(1000);
    });
  });

  describe('static fromSeconds()', () => {
    it('returns a Timestamp initialized with given seconds', () => {
      const result = Timestamp.fromSeconds(1);

      expect(result.millis).toBe(1000);
    });
  });

  describe('static now()', () => {
    it('passes the options to the constructor without specifying a date-time', () => {
      const expected = new Timestamp(undefined, { timeUnit: TimeUnit.Seconds });

      const actual = Timestamp.now({ timeUnit: TimeUnit.Seconds });

      expect(actual.millis).toBe(expected.millis);
    });
  });

  describe('constructor', () => {
    it('given no input, uses the current time as the timestamp', () => {
      const timestamp = new Timestamp();

      expect(timestamp.millis).toBe(Date.now());
    });

    it('given a Timestamp as the input, returns a new Timestamp storing the same value', () => {
      const timestamp = Timestamp.fromSeconds(1);

      const result = new Timestamp(timestamp);

      expect(result.millis).toBe(1000);
    });
  });

  describe('milliseconds properties', () => {
    it('returns the timestamp value in milliseconds', () => {
      const timestamp = new Timestamp(new Date(1000));

      expect(timestamp.millis).toBe(1000);
    });
  });

  describe('seconds property', () => {
    it('returns the timestamp value in seconds', () => {
      const timestamp = new Timestamp(new Date(1000));

      expect(timestamp.seconds).toBe(1);
    });
  });

  describe('clone()', () => {
    it('returns a clone of the timestamp', () => {
      const original = new Timestamp(new Date(1000));

      const clone = original.clone();

      expect(clone.millis).toBe(1000);
      expect(clone).not.toBe(original);
    });

    it('given a timeUnit, returns a clone that uses that time unit', () => {
      const original = new Timestamp(new Date(1000), { timeUnit: TimeUnit.Millis });

      const clone = original.clone({ timeUnit: TimeUnit.Seconds });

      expect(clone.timeUnit).toBe(TimeUnit.Seconds);
      expect(original.millis).toBe(clone.millis);
    });
  });

  describe('setOptions()', () => {
    it('optionally sets the default format', () => {
      const timestamp = new Timestamp(new Date(1000));
      const format = 'humane';

      timestamp.setOptions({ format });

      expect(timestamp.format).toBe(format);
    });

    it("optionally sets the instance's time unit; does not change the stored point in time", () => {
      const timestamp = new Timestamp(new Date(1000));
      const millis = timestamp.millis;

      timestamp.setOptions({ timeUnit: TimeUnit.Seconds });

      expect(timestamp.timeUnit).toBe(TimeUnit.Seconds);
      expect(timestamp.millis).toBe(millis);
    });
  });

  describe('toCompactString()', () => {
    const useCases = [
      { timeUnit: TimeUnit.Millis, expected: '20230102-134501.234' },
      { timeUnit: TimeUnit.Seconds, expected: '20230102-134501' },
      { timeUnit: TimeUnit.Minutes, expected: '20230102-1345' },
      { timeUnit: TimeUnit.Hours, expected: '20230102-13' },
      { timeUnit: TimeUnit.Days, expected: '20230102' },
    ];

    it.each(useCases)(`when timeUnit=$timeUnit.plural, returns a string like $expected`, ({ expected, timeUnit }) => {
      const timestamp = new Timestamp(isoDateTime);

      const actual = timestamp.toCompactString({ timeUnit });

      expect(actual).toBe(expected);
    });
  });

  describe('toDate()', () => {
    it('returns a Date object representing point in time stored in the Timestamp', () => {
      const timestamp = new Timestamp(new Date(1000));

      const actual = timestamp.toDate();

      expect(actual).toBeInstanceOf(Date);
      expect(actual.getTime()).toBe(1000);
    });
  });

  describe('toHumaneUtcString()', () => {
    const timestamp = new Timestamp('2023-01-02T13:45:01.234Z');

    it.each([
      { timeUnit: TimeUnit.Millis, expected: '2023-01-02 13:45:01.234 UTC' },
      { timeUnit: TimeUnit.Seconds, expected: '2023-01-02 13:45:01 UTC' },
      { timeUnit: TimeUnit.Minutes, expected: '2023-01-02 13:45 UTC' },
      { timeUnit: TimeUnit.Days, expected: '2023-01-02 UTC' },
    ])('when timeUnit=$timeUnit.plural, returns a string like $expected', ({ expected, timeUnit }) => {
      const actual = timestamp.toHumaneUtcString({ timeUnit });
      expect(actual).toBe(expected);
    });

    it('if timeUnit=hours, throws an error', () => {
      const throwingFn = () => timestamp.toHumaneUtcString({ timeUnit: TimeUnit.Hours });

      expect(throwingFn).toThrowError(new Error('Method does not support TimeUnit.Hours time unit.'));
    });
  });

  describe('toIsoString()', () => {
    const timestamp = new Timestamp(isoDateTime);

    it.each([
      { timeUnit: TimeUnit.Millis, expected: '2023-01-02T13:45:01.234Z' },
      { timeUnit: TimeUnit.Seconds, expected: '2023-01-02T13:45:01Z' },
      { timeUnit: TimeUnit.Minutes, expected: '2023-01-02T13:45Z' },
      { timeUnit: TimeUnit.Hours, expected: '2023-01-02T13Z' },
      { timeUnit: TimeUnit.Days, expected: '2023-01-02Z' },
    ])('when timeUnit=$timeUnit.plural, returns a string like $expected', ({ expected, timeUnit }) => {
      const actual = timestamp.toIsoString({ timeUnit });
      expect(actual).toBe(expected);
    });
  });

  describe('toLocaleDateTimeString()', () => {
    it('should return a formatted date-time string', () => {
      const timestamp = new Timestamp(isoDateTime);
      const locale = 'en-US';
      const expectedDateString = timestamp.toDate().toLocaleDateString(locale);
      const expectedTimeString = timestamp.toDate().toLocaleTimeString(locale);
      const expectedDateTimeString = expectedDateString + ' ' + expectedTimeString;

      const result = timestamp.toLocaleDateTimeString(locale);

      expect(result).toBe(expectedDateTimeString);
    });
  });

  describe('toNumericString()', () => {
    const timestamp = new Timestamp(isoDateTime);

    it.each([
      { timeUnit: TimeUnit.Millis, expected: '20230102134501234' },
      { timeUnit: TimeUnit.Seconds, expected: '20230102134501' },
      { timeUnit: TimeUnit.Minutes, expected: '202301021345' },
      { timeUnit: TimeUnit.Hours, expected: '2023010213' },
      { timeUnit: TimeUnit.Days, expected: '20230102' },
    ])('when timeUnit=$timeUnit.plural, returns a string like $expected', ({ expected, timeUnit }) => {
      const actual = timestamp.toNumericString({ timeUnit });
      expect(actual).toBe(expected);
    });
  });

  describe('toString()', () => {
    const displayableTimeUnits = [TimeUnit.Millis, TimeUnit.Seconds, TimeUnit.Minutes, TimeUnit.Days];

    it('returns the default string representation', () => {
      const timestamp = new Timestamp(isoDateTime);
      const expected = isoDateTime;

      const actual = timestamp.toString();

      expect(actual).toBe(expected);
    });

    it('if timeUnit has been set, uses that granularity', () => {
      const options = { timeUnit: TimeUnit.Seconds };
      const timestamp = new Timestamp(isoDateTime, options);
      const expected = '2023-01-02T13:45:01Z';

      const actual = timestamp.toString();

      expect(actual).toBe(expected);
    });

    it('if timeUnit is specified, uses that granularity', () => {
      const instanceOptions = { timeUnit: TimeUnit.Seconds };
      const callOptions = { timeUnit: TimeUnit.Minutes };
      const timestamp = new Timestamp(isoDateTime, instanceOptions);
      const expected = '2023-01-02T13:45Z';

      const actual = timestamp.toString(callOptions);

      expect(actual).toBe(expected);
    });

    it('if format=compact, returns the same result as toCompactString()', () => {
      const format = 'compact';
      const timestamp = new Timestamp(isoDateTime);
      for (const timeUnit of displayableTimeUnits) {
        const expected = timestamp.toCompactString({ timeUnit });

        const explicitActual = timestamp.toString({ format, timeUnit });
        const preformattedActual = timestamp.setOptions({ format }).toString({ timeUnit });

        expect(explicitActual).toBe(expected);
        expect(preformattedActual).toBe(expected);
      }
    });

    it('if format=humane, returns the same result as toHumaneUtcString()', () => {
      const format = 'humane';
      const timestamp = new Timestamp(isoDateTime);
      for (const timeUnit of displayableTimeUnits) {
        const expected = timestamp.toHumaneUtcString({ timeUnit });

        const explicitActual = timestamp.toString({ format, timeUnit });
        const preformattedActual = timestamp.setOptions({ format }).toString({ timeUnit });

        expect(explicitActual).toBe(expected);
        expect(preformattedActual).toBe(expected);
      }
    });

    it('if format=numeric, returns the same result as toNumericString()', () => {
      const format = 'numeric';
      const timestamp = new Timestamp(isoDateTime, { format: 'numeric' });
      for (const timeUnit of displayableTimeUnits) {
        const expected = timestamp.toNumericString({ timeUnit });

        const explicitActual = timestamp.toString({ format, timeUnit });
        const preformattedActual = timestamp.setOptions({ format }).toString({ timeUnit });

        expect(explicitActual).toBe(expected);
        expect(preformattedActual).toBe(expected);
      }
    });
  });
});
