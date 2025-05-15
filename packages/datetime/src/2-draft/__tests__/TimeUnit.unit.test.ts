import { assertEquals, assertThrows, describe, it } from '../../dev_deps.ts';

import { TimeUnit, TimeUnitConversionOptions } from '../TimeUnit.ts';

describe('TimeUnit class', () => {
  describe('convert()', () => {
    it('should return the same amount if from and to units are the same', () => {
      const result = TimeUnit.convert(10, TimeUnit.Hours, TimeUnit.Hours);
      assertEquals(result, 10);
    });

    it('correctly converts seconds to milliseconds', () => {
      const result = TimeUnit.convert(1, TimeUnit.Seconds, TimeUnit.Millis);
      assertEquals(result, 1_000);
    });

    it('rounds to the specified number of decimal places', () => {
      const options = { decimalPlaces: 0 };
      const expected = 0;

      const roundedConversion = TimeUnit.convert(1, TimeUnit.Minutes, TimeUnit.Hours, options);

      assertEquals(roundedConversion, expected);
    });

    it('if throwOnFractional=true and result is fractional, throws an error', () => {
      const options: TimeUnitConversionOptions = { throwOnFractional: true };

      const throwingFn = () => TimeUnit.convert(1, TimeUnit.Minutes, TimeUnit.Hours, options);

      assertThrows(
        throwingFn,
        Error,
        '1 minute cannot be converted into a whole number of hours.',
      );
    });
  });

  describe('getInflectedLabel', () => {
    it('returns the singular if amount=1', () => {
      const amount = 1;
      const expected = 'hour';

      const result = TimeUnit.Hours.getInflectedLabel(amount);

      assertEquals(result, expected);
    });

    it('returns the plural if amount<>1', () => {
      const amount = 1.1;
      const expected = 'hours';

      const result = TimeUnit.Hours.getInflectedLabel(amount);

      assertEquals(result, expected);
    });
  });

  describe('getLabeledAmount()', () => {
    it('if amount=1, returns 1 {singular}', () => {
      const amount = 1;
      const expected = '1 minute';

      const result = TimeUnit.Minutes.getLabeledAmount(amount);

      assertEquals(result, expected);
    });

    it('if amount<>1, returns {amount} {plural}', () => {
      const amount = 1.1;
      const expected = '1.1 minutes';

      const result = TimeUnit.Minutes.getLabeledAmount(amount);

      assertEquals(result, expected);
    });

    it('if format=short, returns {amount}{abbrev}', () => {
      const amount = 1.1;
      const expected = '1.1m';

      const result = TimeUnit.Minutes.getLabeledAmount(amount, { format: 'short' });

      assertEquals(result, expected);
    });
  });

  describe('toString()', () => {
    it('should return the label of the unit', () => {
      assertEquals(TimeUnit.Hours.toString(), 'hours');
    });
  });
});
