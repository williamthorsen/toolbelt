import { assertAlmostEquals, assertEquals, assertThrows, describe, it } from '../../dev_deps.ts';
import { TimeUnit } from '../TimeUnit.ts';
import { Timestamp } from '../Timestamp.ts';

const isoDateTime = '2023-01-02T13:45:01.234Z';

describe('Timestamp class', () => {
  describe('static fromMilliseconds()', () => {
    it('returns a Timestamp initialized with given milliseconds', () => {
      const result = Timestamp.fromMillis(1_000);
      assertEquals(result.millis, 1_000);
    });
  });

  describe('static fromSeconds()', () => {
    it('returns a Timestamp initialized with given seconds', () => {
      const result = Timestamp.fromSeconds(1);
      assertEquals(result.millis, 1_000);
    });
  });

  describe('static now()', () => {
    it('passes the options to the constructor without specifying a date-time', () => {
      const expected = new Timestamp(undefined, { timeUnit: TimeUnit.Seconds });

      const actual = Timestamp.now({ timeUnit: TimeUnit.Seconds });

      assertAlmostEquals(actual.millis, expected.millis, 2); // 2 ms - accurate enough for a test
    });
  });

  describe('constructor', () => {
    it('given no input, uses the current time as the timestamp', () => {
      const timestamp = new Timestamp();
      const tolerance = 2; // 2 ms - accurate enough for a test

      assertAlmostEquals(timestamp.millis, Date.now(), tolerance);
    });

    it('given a Timestamp as the input, returns a new Timestamp storing the same value', () => {
      const timestamp = Timestamp.fromSeconds(1);

      const result = new Timestamp(timestamp);

      assertEquals(result.millis, 1_000);
    });
  });

  describe('milliseconds properties', () => {
    it('returns the timestamp value in milliseconds', () => {
      const timestamp = new Timestamp(new Date(1_000));
      assertEquals(timestamp.millis, 1_000);
    });
  });

  describe('seconds property', () => {
    it('returns the timestamp value in seconds', () => {
      const timestamp = new Timestamp(new Date(1_000));
      assertEquals(timestamp.seconds, 1);
    });
  });

  describe('clone()', () => {
    it('returns a clone of the timestamp', () => {
      const original = new Timestamp(new Date(1_000));
      const clone = original.clone();

      assertEquals(clone.millis, 1_000);
      assertEquals(clone !== original, true);
    });

    it('given a timeUnit, returns a clone that uses that time unit', () => {
      const original = new Timestamp(new Date(1_000), { timeUnit: TimeUnit.Millis });

      const clone = original.clone({ timeUnit: TimeUnit.Seconds });

      assertEquals(clone.timeUnit, TimeUnit.Seconds);
      assertEquals(original.millis, clone.millis);
    });
  });

  describe('setOptions()', () => {
    it('optionally sets the default format', () => {
      const timestamp = new Timestamp(new Date(1_000));
      const format = 'humane';

      timestamp.setOptions({ format });

      assertEquals(timestamp.format, format);
    });

    it("optionally sets the instance's time unit; does not change the stored point in time", () => {
      const timestamp = new Timestamp(new Date(1_000));
      const millis = timestamp.millis;

      timestamp.setOptions({ timeUnit: TimeUnit.Seconds });

      assertEquals(timestamp.timeUnit, TimeUnit.Seconds);
      assertEquals(timestamp.millis, millis);
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
    for (const { expected, timeUnit } of useCases) {
      it(`when timeUnit=${timeUnit.plural}, returns a string like ${expected}`, () => {
        const timestamp = new Timestamp(isoDateTime);

        const actual = timestamp.toCompactString({ timeUnit });

        assertEquals(actual, expected);
      });
    }
  });

  describe('toDate()', () => {
    it('returns a Date object representing point in time stored in the Timestamp', () => {
      const timestamp = new Timestamp(new Date(1_000));

      const actual = timestamp.toDate();

      assertEquals(actual instanceof Date, true);
      assertEquals(actual.getTime(), 1_000);
    });
  });

  describe('toHumaneUtcString()', () => {
    const timestamp = new Timestamp('2023-01-02T13:45:01.234Z');
    for (const { expected, timeUnit } of [
      { timeUnit: TimeUnit.Millis, expected: '2023-01-02 13:45:01.234 UTC' },
      { timeUnit: TimeUnit.Seconds, expected: '2023-01-02 13:45:01 UTC' },
      { timeUnit: TimeUnit.Minutes, expected: '2023-01-02 13:45 UTC' },
      { timeUnit: TimeUnit.Days, expected: '2023-01-02 UTC' },
    ]) {
      it(`when timeUnit=${timeUnit.plural}, returns a string like ${expected}`, () => {
        const actual = timestamp.toHumaneUtcString({ timeUnit });
        assertEquals(actual, expected);
      });
    }

    it('if timeUnit=hours, throws an error', () => {
      const throwingFn = () => timestamp.toHumaneUtcString({ timeUnit: TimeUnit.Hours });
      assertThrows(throwingFn, Error, 'Method does not support TimeUnit.Hours time unit.');
    });
  });

  describe('toIsoString()', () => {
    const timestamp = new Timestamp(isoDateTime);
    for (const { expected, timeUnit } of [
      { timeUnit: TimeUnit.Millis, expected: '2023-01-02T13:45:01.234Z' },
      { timeUnit: TimeUnit.Seconds, expected: '2023-01-02T13:45:01Z' },
      { timeUnit: TimeUnit.Minutes, expected: '2023-01-02T13:45Z' },
      { timeUnit: TimeUnit.Hours, expected: '2023-01-02T13Z' },
      { timeUnit: TimeUnit.Days, expected: '2023-01-02Z' },
    ]) {
      it(`when timeUnit=${timeUnit.plural}, returns a string like ${expected}`, () => {
        const actual = timestamp.toIsoString({ timeUnit });
        assertEquals(actual, expected);
      });
    }

    it('given an unknown time unit, throws an error', () => {
      const timestamp = new Timestamp(new Date('2023-01-01T10:10:10.123Z'));

      assertThrows(
        () => timestamp.toIsoString({ timeUnit: 999 as unknown as TimeUnit }), // using an invalid time unit
        Error,
        'Unexpected time unit',
      );
    });
  });

  describe('toLocaleDateTimeString()', () => {
    it('should return a formatted date-time string', () => {
      const timestamp = new Timestamp(isoDateTime);
      const expectedDateString = timestamp.toDate().toLocaleDateString();
      const expectedTimeString = timestamp.toDate().toLocaleTimeString();
      const expectedDateTimeString = expectedDateString + ' ' + expectedTimeString;

      const result = timestamp.toLocaleDateTimeString('en-US');

      assertEquals(result, expectedDateTimeString);
    });
  });

  describe('toNumericString()', () => {
    const timestamp = new Timestamp(isoDateTime);
    for (const { expected, timeUnit } of [
      { timeUnit: TimeUnit.Millis, expected: '20230102134501234' },
      { timeUnit: TimeUnit.Seconds, expected: '20230102134501' },
      { timeUnit: TimeUnit.Minutes, expected: '202301021345' },
      { timeUnit: TimeUnit.Hours, expected: '2023010213' },
      { timeUnit: TimeUnit.Days, expected: '20230102' },
    ]) {
      it(`when timeUnit=${timeUnit.plural}, returns a string like ${expected}`, () => {
        const actual = timestamp.toNumericString({ timeUnit });
        assertEquals(actual, expected);
      });
    }
  });

  describe('toString()', () => {
    const displayableTimeUnits = [TimeUnit.Millis, TimeUnit.Seconds, TimeUnit.Minutes, TimeUnit.Days];

    it('returns the default string representation', () => {
      const timestamp = new Timestamp(isoDateTime);
      const expected = isoDateTime;

      const actual = timestamp.toString();

      assertEquals(actual, expected);
    });

    it('if timeUnit has been set, uses that granularity', () => {
      const options = { timeUnit: TimeUnit.Seconds };
      const timestamp = new Timestamp(isoDateTime, options);
      const expected = '2023-01-02T13:45:01Z';

      const actual = timestamp.toString();

      assertEquals(actual, expected);
    });

    it('if timeUnit is specified, uses that granularity', () => {
      const instanceOptions = { timeUnit: TimeUnit.Seconds };
      const callOptions = { timeUnit: TimeUnit.Minutes };
      const timestamp = new Timestamp(isoDateTime, instanceOptions);
      const expected = '2023-01-02T13:45Z';

      const actual = timestamp.toString(callOptions);

      assertEquals(actual, expected);
    });

    it('if format=compact, returns the same result as toCompactString()', () => {
      const format = 'compact';
      const timestamp = new Timestamp(isoDateTime);
      for (const timeUnit of displayableTimeUnits) {
        const expected = timestamp.toCompactString({ timeUnit });

        const explictActual = timestamp.toString({ format, timeUnit });
        const preformattedActual = timestamp.setOptions({ format }).toString({ timeUnit });

        assertEquals(explictActual, expected);
        assertEquals(preformattedActual, expected);
      }
    });

    it('if format=humane, returns the same result as toHumaneUtcString()', () => {
      const format = 'humane';
      const timestamp = new Timestamp(isoDateTime);
      for (const timeUnit of displayableTimeUnits) {
        const expected = timestamp.toHumaneUtcString({ timeUnit });

        const explictActual = timestamp.toString({ format, timeUnit });
        const preformattedActual = timestamp.setOptions({ format }).toString({ timeUnit });

        assertEquals(explictActual, expected);
        assertEquals(preformattedActual, expected);
      }
    });

    it('if format=numeric, returns the same result as toNumericString()', () => {
      const format = 'numeric';
      const timestamp = new Timestamp(isoDateTime, { format: 'numeric' });
      for (const timeUnit of displayableTimeUnits) {
        const expected = timestamp.toNumericString({ timeUnit });

        const explicitActual = timestamp.toString({ format, timeUnit });
        const preformattedActual = timestamp.setOptions({ format }).toString({ timeUnit });

        assertEquals(explicitActual, expected);
        assertEquals(preformattedActual, expected);
      }
    });
  });
});
