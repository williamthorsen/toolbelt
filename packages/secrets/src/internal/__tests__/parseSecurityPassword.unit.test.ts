import { describe, expect, it } from 'vitest';

import { parseSecurityPassword } from '../parseSecurityPassword.ts';

const TRAILER = 'keychain: "/Users/someone/Library/Keychains/login.keychain-db"\nversion: 512\nclass: "genp"\n';

describe(parseSecurityPassword, () => {
  it('reads the quoted form', () => {
    expect(parse('password: "s3cret value"')).toBe('s3cret value');
  });

  it('reads a quote inside the quoted form, which `security` leaves unescaped', () => {
    expect(parse('password: "a"b"')).toBe('a"b');
  });

  it('reads the empty password, which `security` prints unquoted', () => {
    expect(parse('password: ')).toBe('');
  });

  it('decodes the hex form, which carries a byte outside printable ASCII', () => {
    expect(parse(String.raw`password: 0x610962  "a\011b"`)).toBe('a\tb');
    expect(parse(String.raw`password: 0x6C696E65310A6C696E6532  "line1\012line2"`)).toBe('line1\nline2');
  });

  it('decodes the hex form as UTF-8', () => {
    expect(parse(String.raw`password: 0x70C3A4C2A7E28692  "p\303\244\302\247\342\206\222"`)).toBe('pä§→');
  });

  it('reads hex-looking text as the text that it is, since only the hex form carries the 0x prefix', () => {
    expect(parse('password: "610962"')).toBe('610962');
  });

  it('throws where the output carries no password line', () => {
    expect(() =>
      parseSecurityPassword('security: SecKeychainSearchCopyNext: The specified item could not be found'),
    ).toThrow(/No password line/);
  });

  it('throws on a malformed hex run rather than returning the bytes that it could read', () => {
    expect(() => parse('password: 0x61096  "a"')).toThrow(/Malformed hexadecimal password/);
  });

  it('throws where the hex run is not valid UTF-8', () => {
    expect(() => parse(String.raw`password: 0xFF  "\377"`)).toThrow(/not valid for encoding utf-8/);
  });

  it('throws on a value that is neither form', () => {
    expect(() => parse('password: unquoted')).toThrow(/Unquoted password/);
  });
});

// region | Helpers

/** Wraps a password line in the trailing attribute lines that `security` writes after it. */
function parse(passwordLine: string): string {
  return parseSecurityPassword(`${passwordLine}\n${TRAILER}`);
}

// endregion | Helpers
