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

  it('if bookendSize >= string length, obfuscates all characters', () => {
    const options = { bookendSize: 6 };
    const str = '1234';
    const expected = '****';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('if bookendSize < 0, throws an error', () => {
    const options = { bookendSize: -1 };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrowError('Minimum bookendSize is 0.');
  });

  it('if fillChar is given, uses it as the replacement character', () => {
    const options = { fillChar: '@' };
    const str = '1234';
    const expected = '@@@@';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('if fillChar is an empty string, throws an error', () => {
    const options = { bookendSize: 2, fillChar: '' };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrowError('fillChar must be a single character.');
  });

  it('if fillChar is longer than one character, throws an error', () => {
    const options = { fillChar: '**' };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrowError('fillChar must be a single character.');
  });

  it('if fillSize is given, display at most {fillSize} fill characters', () => {
    const options = { bookendSize: 2, fillSize: 3 };
    const str = '123456789';
    const expected = '12***89';

    const actual = obfuscate(str, options);

    expect(actual).toBe(expected);
  });

  it('if fillSize < bookendSize, throws an error', () => {
    const options = { bookendSize: 4, fillSize: 2 };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrowError('fillSize cannot be less than bookendSize.');
  });

  it('if fillSize < 1, throws an error', () => {
    const options = { fillSize: 0 };
    const str = '1234';

    expect(() => obfuscate(str, options)).toThrowError('Minimum fillSize is 1.');
  });
});
