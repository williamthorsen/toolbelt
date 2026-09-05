import { describe, expect, it } from 'vitest';

import { obfuscate } from '../obfuscate.ts';

describe(obfuscate, () => {
  it('replaces all characters with asterisks', () => {
    const str = '1234';
    const expected = '****';

    const actual = obfuscate(str);

    expect(actual).toBe(expected);
  });

  it('if bookendSize > 0, reveals {bookendSize} characters at beginning and end', () => {
    const options = { bookendSize: 4 };
    const str = '123456789012';
    const expected = '1234****9012';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('hides at least {bookendSize} characters', () => {
    const options = { bookendSize: 4 };
    const str = '123456';
    const expected = '1****6';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('hides at least {bookendSize} characters, revealing a whole number at each end', () => {
    const options = { bookendSize: 4 };
    const str = '123456789';
    const expected = '12*****89';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('if bookendSize >= string length, obfuscates all characters', () => {
    const options = { bookendSize: 6 };
    const str = '1234';
    const expected = '****';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('if bookendSize is fractional, ignores its decimal part', () => {
    const options = { bookendSize: 2.5 };
    const str = '1234567890';
    const expected = '12******90';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('if bookendSize < 0, throws a RangeError', () => {
    const options = { bookendSize: -1 };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrow(new RangeError('Minimum bookendSize is 0.'));
  });

  it('if bookendSize is NaN, throws a TypeError', () => {
    const options = { bookendSize: NaN };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrow(new TypeError('bookendSize cannot be NaN.'));
  });

  it('if fillChar is given, uses it as the replacement character', () => {
    const options = { fillChar: '@' };
    const str = '1234';
    const expected = '@@@@';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('if fillChar is an empty string, throws a TypeError', () => {
    const options = { bookendSize: 2, fillChar: '' };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrow(new TypeError('fillChar must be a single character.'));
  });

  it('if fillChar is longer than one character, throws a TypeError', () => {
    const options = { fillChar: '**' };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrow(new TypeError('fillChar must be a single character.'));
  });

  it('if fillSize is given, displays at most {fillSize} fill characters', () => {
    const options = { bookendSize: 2, fillSize: 3 };
    const str = '123456789';
    const expected = '12***89';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('if fillSize < bookendSize, throws a RangeError', () => {
    const options = { bookendSize: 4, fillSize: 2 };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrow(new RangeError('fillSize cannot be less than bookendSize.'));
  });

  it('if fillSize < 1, throws a RangeError', () => {
    const options = { fillSize: 0 };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrow(new RangeError('Minimum fillSize is 1.'));
  });

  it('if fillSize is NaN, throws a TypeError', () => {
    const options = { fillSize: NaN };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrow(new TypeError('fillSize cannot be NaN.'));
  });
});
