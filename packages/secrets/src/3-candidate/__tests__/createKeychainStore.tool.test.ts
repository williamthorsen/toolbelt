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

const TAB_SECRET = 'a\tb';

describe.skipIf(process.platform !== 'darwin')(createKeychainStore, () => {
  it('reads a secret `security` prints between quotes', () => {
    withKeychain((keychain) => {
      expect(createKeychainStore({ keychain }).findSecret({ service: PLAIN_SERVICE })).toBe('plain value');
    });
  });

  it('reads a secret `security` prints as hexadecimal, which is any carrying an unprintable byte', () => {
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

  it('answers undefined where the keychain holds no such item', () => {
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
});

// region | Helpers

/** Runs `security`, raising what it wrote where it failed, so a broken fixture is not read as a result. */
function runSecurity(args: string[]): void {
  execFileSync(SECURITY_PATH, args, { encoding: 'utf8', stdio: 'pipe' });
}

/**
 * Places the fixtures in a keychain created for this call and deleted after it, so no test reaches the login
 * keychain. Seeding passes each value on argv, which the store itself refuses to do: it is the only way to
 * place an item in a named keychain, and these values are fixtures rather than secrets.
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
