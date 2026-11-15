import { captureError } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { SecretStoreError } from '../../3-candidate/SecretStoreError.ts';
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

  it('decodes the hex form, which contains a byte outside printable ASCII', () => {
    expect(parse(String.raw`password: 0x610962  "a\011b"`)).toBe('a\tb');
    expect(parse(String.raw`password: 0x6C696E65310A6C696E6532  "line1\012line2"`)).toBe('line1\nline2');
  });

  it('decodes the hex form as UTF-8', () => {
    expect(parse(String.raw`password: 0x70C3A4C2A7E28692  "p\303\244\302\247\342\206\222"`)).toBe('pä§→');
  });

  it('reads hex-looking text as the text that it is, since only the hex form has the 0x prefix', () => {
    expect(parse('password: "610962"')).toBe('610962');
  });

  it('throws when the output contains no password line', async () => {
    const { message } = await captureError(SecretStoreError, () =>
      parseSecurityPassword('security: SecKeychainSearchCopyNext: The specified item could not be found'),
    );

    expect(message).toMatch(/No password line/);
  });

  it('throws on a malformed hex run rather than returning the bytes that it could read', async () => {
    const { message } = await captureError(SecretStoreError, () => parse('password: 0x61096  "a"'));

    expect(message).toMatch(/Malformed hexadecimal password/);
  });

  it('keeps a malformed hex value out of the error message', async () => {
    const { message } = await captureError(SecretStoreError, () => parse('password: 0x733363726  "s3cre"'));

    expect(message).toMatch(/Malformed hexadecimal password/);
    expect(message).not.toContain('733363726');
    expect(message).not.toContain('s3cre');
  });

  it('throws when the hex run is not valid UTF-8', async () => {
    const error = await captureError(SecretStoreError, () => parse(String.raw`password: 0xFF  "\377"`));

    expect(error.message).toMatch(/^Undecodable password in the output of `security`: .*not valid for encoding utf-8/);
    expect(error.cause).toBeInstanceOf(TypeError);
  });

  it('throws on a value that is neither form', async () => {
    const { message } = await captureError(SecretStoreError, () => parse('password: unquoted'));

    expect(message).toMatch(/Unquoted password/);
  });

  it('keeps an unquoted value out of the error message', async () => {
    const { message } = await captureError(SecretStoreError, () => parse('password: unquoted-s3cret'));

    expect(message).toMatch(/Unquoted password/);
    expect(message).not.toContain('s3cret');
  });
});

// region | Helpers

/** Parses a password line followed by the trailing attribute lines that `security` writes after it. */
function parse(passwordLine: string): string {
  return parseSecurityPassword(`${passwordLine}\n${TRAILER}`);
}

// endregion | Helpers
