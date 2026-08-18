import { describe, expect, it } from 'vitest';

import { TimeUnit, type TimeUnitConversionOptions } from '../TimeUnit.ts';

describe(TimeUnit, () => {
  describe('coarsestFirst', () => {
    it('runs from the coarsest unit to the finest', () => {
      const expected = [TimeUnit.Days, TimeUnit.Hours, TimeUnit.Minutes, TimeUnit.Seconds, TimeUnit.Millis];

      expect(TimeUnit.coarsestFirst).toStrictEqual(expected);
    });

    it('holds every unit the class declares', () => {
      const declaredUnits = Object.values(TimeUnit).filter((value) => value instanceof TimeUnit);

      expect(new Set(TimeUnit.coarsestFirst)).toStrictEqual(new Set(declaredUnits));
    });
  });

  describe('convert()', () => {
    it('should return the same amount if from and to units are the same', () => {
      const result = TimeUnit.convert(10, TimeUnit.Hours, TimeUnit.Hours);

      expect(result).toBe(10);
    });

    it('correctly converts seconds to milliseconds', () => {
      const result = TimeUnit.convert(1, TimeUnit.Seconds, TimeUnit.Millis);

      expect(result).toBe(1_000);
    });

    it('converts a whole number of milliseconds to a whole number of hours', () => {
      const result = TimeUnit.convert(3_600_000, TimeUnit.Millis, TimeUnit.Hours);

      expect(result).toBe(1);
    });

    it('floors to the exact whole count for every ordered pair of units', () => {
      const misconversions: string[] = [];
      let comparisons = 0;

      for (const fromUnit of TimeUnit.coarsestFirst) {
        for (const toUnit of TimeUnit.coarsestFirst) {
          for (let count = 1; count <= 1_000; count += 1) {
            // Express `count` whole `toUnit`s as an amount of `fromUnit`s, skipping the pairs that
            // cannot be said in whole `fromUnit`s.
            const amount = (count * toUnit.inMillis) / fromUnit.inMillis;
            if (!Number.isSafeInteger(amount)) continue;

            comparisons += 1;
            const converted = Math.floor(TimeUnit.convert(amount, fromUnit, toUnit));
            if (converted !== count) {
              misconversions.push(
                `${amount} ${fromUnit.plural} floors to ${converted} ${toUnit.plural}, expected ${count}`,
              );
            }
          }
        }
      }

      expect(misconversions).toStrictEqual([]);
      // Guard against a vacuous pass: a broken loop would report no misconversions either.
      expect(comparisons).toBeGreaterThan(0);
    });

    it('returns the unrounded value when no decimalPlaces is given', () => {
      const expected = 0.016666666666666666;

      const conversion = TimeUnit.convert(1, TimeUnit.Minutes, TimeUnit.Hours);

      expect(conversion).toBe(expected);
    });

    it('rounds to whole units when decimalPlaces is 0', () => {
      const options = { decimalPlaces: 0 };
      const expected = 0;

      const roundedConversion = TimeUnit.convert(1, TimeUnit.Minutes, TimeUnit.Hours, options);

      expect(roundedConversion).toBe(expected);
    });

    it('rounds to the specified number of decimal places', () => {
      const options = { decimalPlaces: 3 };
      const expected = 0.017;

      const roundedConversion = TimeUnit.convert(1, TimeUnit.Minutes, TimeUnit.Hours, options);

      expect(roundedConversion).toBe(expected);
    });

    it('if throwOnFractional=true and result is fractional, throws an error', () => {
      const options: TimeUnitConversionOptions = { throwOnFractional: true };

      const throwingFn = () => TimeUnit.convert(1, TimeUnit.Minutes, TimeUnit.Hours, options);

      expect(throwingFn).toThrow(new Error('1 minute cannot be converted into an exact whole number of hours.'));
    });

    it('if throwOnFractional=true and the result exceeds safe-integer precision, throws an error', () => {
      const options: TimeUnitConversionOptions = { throwOnFractional: true };

      const throwingFn = () => TimeUnit.convert(1e18, TimeUnit.Seconds, TimeUnit.Millis, options);

      expect(throwingFn).toThrow(
        new Error('1000000000000000000 seconds cannot be converted into an exact whole number of milliseconds.'),
      );
    });

    it('if throwOnFractional=true and the result is the largest representable duration, returns it', () => {
      const options: TimeUnitConversionOptions = { throwOnFractional: true };
      const expected = 8_640_000_000_000_000; // 100 million days, the documented ceiling

      const actual = TimeUnit.convert(100_000_000, TimeUnit.Days, TimeUnit.Millis, options);

      expect(actual).toBe(expected);
    });
  });

  describe('formatLabeledCount()', () => {
    it('if amount=1, returns 1 {singular}', () => {
      const amount = 1;
      const expected = '1 minute';

      const result = TimeUnit.Minutes.formatLabeledCount(amount);

      expect(result).toBe(expected);
    });

    it('if amount<>1, returns {amount} {plural}', () => {
      const amount = 1.1;
      const expected = '1.1 minutes';

      const result = TimeUnit.Minutes.formatLabeledCount(amount);

      expect(result).toBe(expected);
    });

    it('if format=short, returns {amount}{abbrev}', () => {
      const amount = 1.1;
      const expected = '1.1m';

      const result = TimeUnit.Minutes.formatLabeledCount(amount, { format: 'short' });

      expect(result).toBe(expected);
    });
  });

  describe('inflectLabel', () => {
    it('returns the singular if amount=1', () => {
      const amount = 1;
      const expected = 'hour';

      const result = TimeUnit.Hours.inflectLabel(amount);

      expect(result).toBe(expected);
    });

    it('returns the plural if amount<>1', () => {
      const amount = 1.1;
      const expected = 'hours';

      const result = TimeUnit.Hours.inflectLabel(amount);

      expect(result).toBe(expected);
    });
  });

  describe('toString()', () => {
    it('should return the label of the unit', () => {
      expect(TimeUnit.Hours.toString()).toBe('hours');
    });
  });
});
