import { describe, expect, it } from 'vitest';

import { TimeUnit, type TimeUnitConversionOptions } from '../TimeUnit.ts';

describe(TimeUnit, () => {
  describe('convert()', () => {
    it('should return the same amount if from and to units are the same', () => {
      const result = TimeUnit.convert(10, TimeUnit.Hours, TimeUnit.Hours);

      expect(result).toBe(10);
    });

    it('correctly converts seconds to milliseconds', () => {
      const result = TimeUnit.convert(1, TimeUnit.Seconds, TimeUnit.Millis);

      expect(result).toBe(1000);
    });

    it('rounds to the specified number of decimal places', () => {
      const options = { decimalPlaces: 0 };
      const expected = 0;

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

  describe('getLabeledCount()', () => {
    it('if amount=1, returns 1 {singular}', () => {
      const amount = 1;
      const expected = '1 minute';

      const result = TimeUnit.Minutes.getLabeledCount(amount);

      expect(result).toBe(expected);
    });

    it('if amount<>1, returns {amount} {plural}', () => {
      const amount = 1.1;
      const expected = '1.1 minutes';

      const result = TimeUnit.Minutes.getLabeledCount(amount);

      expect(result).toBe(expected);
    });

    it('if format=short, returns {amount}{abbrev}', () => {
      const amount = 1.1;
      const expected = '1.1m';

      const result = TimeUnit.Minutes.getLabeledCount(amount, { format: 'short' });

      expect(result).toBe(expected);
    });
  });

  describe('getInflectedLabel', () => {
    it('returns the singular if amount=1', () => {
      const amount = 1;
      const expected = 'hour';

      const result = TimeUnit.Hours.getInflectedLabel(amount);

      expect(result).toBe(expected);
    });

    it('returns the plural if amount<>1', () => {
      const amount = 1.1;
      const expected = 'hours';

      const result = TimeUnit.Hours.getInflectedLabel(amount);

      expect(result).toBe(expected);
    });
  });

  describe('toString()', () => {
    it('should return the label of the unit', () => {
      expect(TimeUnit.Hours.toString()).toBe('hours');
    });
  });
});
