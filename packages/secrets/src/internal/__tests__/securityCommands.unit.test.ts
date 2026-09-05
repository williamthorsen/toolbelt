import { describe, expect, it } from 'vitest';

import { composeSetLine } from '../securityCommands.ts';
import { UnstorableSecretError } from '../UnstorableSecretError.ts';

const KEYCHAIN = '/tmp/project.keychain-db';
const MAX_LINE_BYTES = 4_095;
const QUERY = { account: 'me@example.com', service: 'atlassian-api-token' };

describe(composeSetLine, () => {
  it('composes the command that stores the secret, with the secret in hexadecimal', () => {
    expect(composeSetLine({ service: 'token' }, 'ab')).toBe('add-generic-password -U -a "" -s "token" -X 6162');
  });

  it('names the account carried by the query', () => {
    expect(composeSetLine(QUERY, 'ab')).toContain('-a "me@example.com"');
  });

  it('names the keychain last, where `security` expects it', () => {
    expect(composeSetLine({ service: 'token' }, 'ab', KEYCHAIN)).toBe(
      `add-generic-password -U -a "" -s "token" -X 6162 "${KEYCHAIN}"`,
    );
  });

  it('escapes a quote and a backslash in the service, which would otherwise end the token', () => {
    expect(composeSetLine({ service: String.raw`a"b\c` }, 'ab')).toContain(String.raw`-s "a\"b\\c"`);
  });

  it('encodes a secret carrying a line break, which is what the hexadecimal form is for', () => {
    expect(composeSetLine({ service: 'token' }, 'a\nb')).toContain('-X 610a62');
  });

  it('encodes a multi-byte secret as its UTF-8 bytes', () => {
    expect(composeSetLine({ service: 'token' }, 'é')).toContain('-X c3a9');
  });

  it('composes the longest secret that fits', () => {
    const secret = 'a'.repeat(findMaxSecretBytes({ service: 'token' }));

    expect(Buffer.byteLength(composeSetLine({ service: 'token' }, secret), 'utf8')).toBeLessThanOrEqual(MAX_LINE_BYTES);
  });

  it('refuses one byte more, since `security` reads the overflow as its next command', () => {
    const secret = 'a'.repeat(findMaxSecretBytes({ service: 'token' }) + 1);

    expect(() => composeSetLine({ service: 'token' }, secret)).toThrow(UnstorableSecretError);
  });

  it('reports the ceiling, the size, and the room left, and repeats no part of the secret', () => {
    const secret = 'sesame'.repeat(1_000);

    expect(() => composeSetLine({ service: 'token' }, secret)).toThrow(
      'The command line would be 12044 bytes and `security` reads at most 4095. The rest of the command leaves ' +
        'room for a secret of 2025 bytes.',
    );
    expect(() => composeSetLine({ service: 'token' }, secret)).not.toThrow(/sesame/);
  });

  it('leaves less room where the service, account, and keychain take more', () => {
    expect(findMaxSecretBytes({ service: 'token' }, KEYCHAIN)).toBeLessThan(findMaxSecretBytes({ service: 'token' }));
  });

  it('refuses an account carrying a line break', () => {
    expect(() => composeSetLine({ account: 'a\nb', service: 'token' }, 'ab')).toThrow(/line break/);
  });

  it('refuses a service carrying a line break', () => {
    expect(() => composeSetLine({ service: 'a\nb' }, 'ab')).toThrow(/line break/);
  });

  it('refuses a keychain carrying a line break', () => {
    expect(() => composeSetLine({ service: 'token' }, 'ab', 'a\nb')).toThrow(/line break/);
  });
});

// region | Helpers

/** Finds the longest secret for which a query leaves room, from the line that a one-byte secret composes to. */
function findMaxSecretBytes(query: { service: string }, keychain?: string): number {
  const fixedBytes = Buffer.byteLength(composeSetLine(query, 'a', keychain), 'utf8') - 2;

  return Math.floor((MAX_LINE_BYTES - fixedBytes) / 2);
}

// endregion | Helpers
