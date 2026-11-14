import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { makeFixture } from '@williamthorsen/toolbelt.vitest/candidate';
import { describe, expect, it as baseIt } from 'vitest';

import { canCreateKeychain, createTempKeychain, type TempKeychain } from '../../test-utils/createTempKeychain.ts';
import { createKeychainStore } from '../createKeychainStore.ts';

const SECURITY_PATH = '/usr/bin/security';

// Unique per run, so an assertion about the default keychain cannot collide with an item already stored there.
const SERVICE_PREFIX = `tb-secret-test-${randomUUID().slice(0, 8)}`;

const ABSENT_SERVICE = `${SERVICE_PREFIX}-absent`;
const HEX_SERVICE = `${SERVICE_PREFIX}-hex`;
const PLAIN_SERVICE = `${SERVICE_PREFIX}-plain`;
const SHARED_SERVICE = `${SERVICE_PREFIX}-shared`;
const WRITTEN_SERVICE = `${SERVICE_PREFIX}-written`;

const PLAIN_VALUE = 'plain value';
const TAB_SECRET = 'a\tb';

// `security` cuts a secret read from stdin at 128 bytes, and 129 is the shortest length that exposes the cut. The
// longest is a little under the 4,095-byte command line that contains the secret as hexadecimal.
const BOUNDARY_LENGTHS = [127, 128, 129, 190, 1900];

// An example that writes or deletes takes `keychain`, empty and its own; one that only reads takes the shared
// `seededKeychain`.
const it = baseIt
  .extend('keychain', makeFixture(createTempKeychain))
  .extend('seededKeychain', { scope: 'file' }, makeFixture(createSeededKeychain));

describe.skipIf(!canCreateKeychain)(createKeychainStore, () => {
  it('reads a secret that `security` prints between quotes', ({ seededKeychain }) => {
    expect(createKeychainStore({ keychain: seededKeychain.path }).findSecret({ service: PLAIN_SERVICE })).toBe(
      PLAIN_VALUE,
    );
  });

  it('reads a secret that `security` prints as hexadecimal, which is any that contains an unprintable byte', ({
    seededKeychain,
  }) => {
    const store = createKeychainStore({ keychain: seededKeychain.path });

    expect(store.findSecret({ account: 'me@example.com', service: HEX_SERVICE })).toBe(TAB_SECRET);
  });

  it('matches the account exactly, rather than any item with the service', ({ seededKeychain }) => {
    const store = createKeychainStore({ keychain: seededKeychain.path });

    expect(store.findSecret({ account: 'second', service: SHARED_SERVICE })).toBe('second value');
  });

  it('returns undefined when the keychain contains no such item', ({ seededKeychain }) => {
    expect(
      createKeychainStore({ keychain: seededKeychain.path }).findSecret({ service: ABSENT_SERVICE }),
    ).toBeUndefined();
  });

  it('reports presence without reading the secret', ({ seededKeychain }) => {
    const store = createKeychainStore({ keychain: seededKeychain.path });

    expect(store.hasSecret({ service: PLAIN_SERVICE })).toBe(true);
    expect(store.hasSecret({ service: ABSENT_SERVICE })).toBe(false);
  });

  it('removes an item once, then reports it absent', ({ keychain }) => {
    const store = createKeychainStore({ keychain: keychain.path });
    seedItem(keychain.path, PLAIN_SERVICE, '', PLAIN_VALUE);

    expect(store.deleteSecret({ service: PLAIN_SERVICE })).toBe(true);
    expect(store.deleteSecret({ service: PLAIN_SERVICE })).toBe(false);
    expect(store.hasSecret({ service: PLAIN_SERVICE })).toBe(false);
  });

  it('leaves the default keychain untouched, which is where the login keychain sits', ({ seededKeychain }) => {
    expect(createKeychainStore({ keychain: seededKeychain.path }).hasSecret({ service: PLAIN_SERVICE })).toBe(true);
    expect(createKeychainStore().hasSecret({ service: PLAIN_SERVICE })).toBe(false);
  });

  describe('setSecret', () => {
    it.for(BOUNDARY_LENGTHS)('stores a secret of %i characters intact', (length, { keychain }) => {
      const store = createKeychainStore({ keychain: keychain.path });
      const secret = buildSecret(length);

      store.setSecret({ service: WRITTEN_SERVICE }, secret);

      expect(store.findSecret({ service: WRITTEN_SERVICE })).toBe(secret);
    });

    it.for([
      { label: 'a line break', secret: 'first\nsecond' },
      { label: 'a quote', secret: 'a"b' },
      { label: 'a backslash', secret: String.raw`a\b` },
      { label: 'a tab', secret: TAB_SECRET },
      { label: 'multi-byte characters', secret: 'ünïcodé' },
    ])('stores a secret that contains $label byte for byte', ({ secret }, { keychain }) => {
      const store = createKeychainStore({ keychain: keychain.path });

      store.setSecret({ service: WRITTEN_SERVICE }, secret);

      expect(store.findSecret({ service: WRITTEN_SERVICE })).toBe(secret);
    });

    it('stores under a service and account that the command line has to quote', ({ keychain }) => {
      const store = createKeychainStore({ keychain: keychain.path });
      const query = { account: 'me "the" admin', service: String.raw`svc with "quotes" and \ backslash` };

      store.setSecret(query, 's3cret');

      expect(store.findSecret(query)).toBe('s3cret');
    });

    it('replaces a secret already stored under the same service and account', ({ keychain }) => {
      const store = createKeychainStore({ keychain: keychain.path });
      seedItem(keychain.path, PLAIN_SERVICE, '', PLAIN_VALUE);

      store.setSecret({ service: PLAIN_SERVICE }, 'replacement');

      expect(store.findSecret({ service: PLAIN_SERVICE })).toBe('replacement');
    });

    it('refuses a secret too long for the command line, storing nothing', ({ keychain }) => {
      const store = createKeychainStore({ keychain: keychain.path });

      expect(() => store.setSecret({ service: WRITTEN_SERVICE }, buildSecret(2100))).toThrow(/too long/);
      expect(store.hasSecret({ service: WRITTEN_SERVICE })).toBe(false);
    });
  });
});

// region | Helpers

/** Builds a secret of a given length, varied so that a cut one cannot match a shorter one by accident. */
function buildSecret(length: number): string {
  return Array.from({ length }, (_, index) => String.fromCodePoint(97 + (index % 26))).join('');
}

/** Creates a keychain holding the items that the reading examples look up. */
function createSeededKeychain(): TempKeychain {
  using stack = new DisposableStack();
  const keychain = stack.use(createTempKeychain());

  seedItem(keychain.path, PLAIN_SERVICE, '', PLAIN_VALUE);
  seedItem(keychain.path, HEX_SERVICE, 'me@example.com', TAB_SECRET);
  seedItem(keychain.path, SHARED_SERVICE, 'first', 'first value');
  seedItem(keychain.path, SHARED_SERVICE, 'second', 'second value');

  // Release the keychain from the stack, so that it outlives this call once seeding succeeds.
  stack.move();

  return keychain;
}

/** Runs `security`, raising what it wrote when it fails, so that a broken fixture is not read as a result. */
function runSecurity(args: string[]): void {
  execFileSync(SECURITY_PATH, args, { encoding: 'utf8', stdio: 'pipe' });
}

/**
 * Places one fixture item in a keychain. Seeding passes the value on argv, which the store itself refuses to
 * do: These are fixtures rather than secrets, and passing them this way keeps the seeding independent of the
 * write under test.
 */
function seedItem(keychain: string, service: string, account: string, value: string): void {
  runSecurity(['add-generic-password', '-U', '-a', account, '-s', service, '-w', value, keychain]);
}

// endregion | Helpers
