import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { describe, expect, it } from 'vitest';

import { createKeychainStore } from '../createKeychainStore.ts';

const SECURITY_PATH = '/usr/bin/security';

// Unique per run, so an assertion about the default keychain cannot collide with an item already held there.
const SERVICE_PREFIX = `tb-secret-test-${randomUUID().slice(0, 8)}`;

const ABSENT_SERVICE = `${SERVICE_PREFIX}-absent`;
const HEX_SERVICE = `${SERVICE_PREFIX}-hex`;
const PLAIN_SERVICE = `${SERVICE_PREFIX}-plain`;
const SHARED_SERVICE = `${SERVICE_PREFIX}-shared`;
const WRITTEN_SERVICE = `${SERVICE_PREFIX}-written`;

const TAB_SECRET = 'a\tb';

// 128 is where `security` cut a secret read from stdin, and 129 is the shortest one that exposed the cut. The
// longest is a little under the 4,095-byte command line that carries the secret as hexadecimal.
const BOUNDARY_LENGTHS = [127, 128, 129, 190, 1_900];

describe.skipIf(process.platform !== 'darwin')(createKeychainStore, () => {
  it('reads a secret that `security` prints between quotes', () => {
    withKeychain((keychain) => {
      expect(createKeychainStore({ keychain }).findSecret({ service: PLAIN_SERVICE })).toBe('plain value');
    });
  });

  it('reads a secret that `security` prints as hexadecimal, which is any carrying an unprintable byte', () => {
    withKeychain((keychain) => {
      const secret = createKeychainStore({ keychain }).findSecret({ account: 'me@example.com', service: HEX_SERVICE });

      expect(secret).toBe(TAB_SECRET);
    });
  });

  it('matches the account exactly, rather than any item holding the service', () => {
    withKeychain((keychain) => {
      const store = createKeychainStore({ keychain });

      expect(store.findSecret({ account: 'second', service: SHARED_SERVICE })).toBe('second value');
    });
  });

  it('returns undefined where the keychain holds no such item', () => {
    withKeychain((keychain) => {
      expect(createKeychainStore({ keychain }).findSecret({ service: ABSENT_SERVICE })).toBeUndefined();
    });
  });

  it('reports presence without reading the secret', () => {
    withKeychain((keychain) => {
      const store = createKeychainStore({ keychain });

      expect(store.hasSecret({ service: PLAIN_SERVICE })).toBe(true);
      expect(store.hasSecret({ service: ABSENT_SERVICE })).toBe(false);
    });
  });

  it('removes an item once, then reports it absent', () => {
    withKeychain((keychain) => {
      const store = createKeychainStore({ keychain });

      expect(store.deleteSecret({ service: PLAIN_SERVICE })).toBe(true);
      expect(store.deleteSecret({ service: PLAIN_SERVICE })).toBe(false);
      expect(store.hasSecret({ service: PLAIN_SERVICE })).toBe(false);
    });
  });

  it('leaves the default keychain untouched, which is where the login keychain sits', () => {
    withKeychain(() => {
      expect(createKeychainStore().hasSecret({ service: PLAIN_SERVICE })).toBe(false);
    });
  });

  describe('setSecret', () => {
    it.each(BOUNDARY_LENGTHS)('stores a secret of %i characters intact', (length) => {
      withKeychain((keychain) => {
        const store = createKeychainStore({ keychain });
        const secret = buildSecret(length);

        store.setSecret({ service: WRITTEN_SERVICE }, secret);

        expect(store.findSecret({ service: WRITTEN_SERVICE })).toBe(secret);
      });
    });

    it.each([
      { label: 'a line break', secret: 'first\nsecond' },
      { label: 'a quote', secret: 'a"b' },
      { label: 'a backslash', secret: String.raw`a\b` },
      { label: 'a tab', secret: TAB_SECRET },
      { label: 'multi-byte characters', secret: 'ünïcodé' },
    ])('stores a secret carrying $label byte for byte', ({ secret }) => {
      withKeychain((keychain) => {
        const store = createKeychainStore({ keychain });

        store.setSecret({ service: WRITTEN_SERVICE }, secret);

        expect(store.findSecret({ service: WRITTEN_SERVICE })).toBe(secret);
      });
    });

    it('stores under a service and account that the command line has to quote', () => {
      withKeychain((keychain) => {
        const store = createKeychainStore({ keychain });
        const query = { account: 'me "the" admin', service: String.raw`svc with "quotes" and \ backslash` };

        store.setSecret(query, 's3cret');

        expect(store.findSecret(query)).toBe('s3cret');
      });
    });

    it('replaces a secret already held under the same service and account', () => {
      withKeychain((keychain) => {
        const store = createKeychainStore({ keychain });

        store.setSecret({ service: PLAIN_SERVICE }, 'replacement');

        expect(store.findSecret({ service: PLAIN_SERVICE })).toBe('replacement');
      });
    });

    it('refuses a secret past the command line, storing nothing', () => {
      withKeychain((keychain) => {
        const store = createKeychainStore({ keychain });

        expect(() => store.setSecret({ service: WRITTEN_SERVICE }, buildSecret(2_100))).toThrow(/too long/);
        expect(store.hasSecret({ service: WRITTEN_SERVICE })).toBe(false);
      });
    });
  });
});

// region | Helpers

/** Builds a secret of a given length, varied so a cut one cannot match a shorter one by accident. */
function buildSecret(length: number): string {
  return Array.from({ length }, (_, index) => String.fromCodePoint(97 + (index % 26))).join('');
}

/** Runs `security`, raising what it wrote where it failed, so a broken fixture is not read as a result. */
function runSecurity(args: string[]): void {
  execFileSync(SECURITY_PATH, args, { encoding: 'utf8', stdio: 'pipe' });
}

/**
 * Places the fixtures in a keychain created for this call and deleted after it, so no test reaches the login
 * keychain. Seeding passes each value on argv, which the store itself refuses to do: these are fixtures rather
 * than secrets, and passing them this way keeps the seeding independent of the write under test.
 */
function withKeychain(use: (keychain: string) => void): void {
  using tree = createTempTree({});
  const keychain = tree.resolve('probe.keychain-db');
  const password = randomUUID();

  runSecurity(['create-keychain', '-p', password, keychain]);

  try {
    runSecurity(['unlock-keychain', '-p', password, keychain]);
    seedItem(keychain, PLAIN_SERVICE, '', 'plain value');
    seedItem(keychain, HEX_SERVICE, 'me@example.com', TAB_SECRET);
    seedItem(keychain, SHARED_SERVICE, 'first', 'first value');
    seedItem(keychain, SHARED_SERVICE, 'second', 'second value');

    use(keychain);
  } finally {
    runSecurity(['delete-keychain', keychain]);
  }
}

/** Places one fixture item in a keychain. */
function seedItem(keychain: string, service: string, account: string, value: string): void {
  runSecurity(['add-generic-password', '-U', '-a', account, '-s', service, '-w', value, keychain]);
}

// endregion | Helpers
