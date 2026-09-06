import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';

const SECURITY_PATH = '/usr/bin/security';

/**
 * Creates an unlocked keychain of its own, deleted on disposal, so that no test reaches the login keychain.
 * Requires macOS.
 *
 * @internal
 */
export function createTempKeychain(): TempKeychain {
  const tree = createTempTree({});
  const keychainPath = tree.resolve('probe.keychain-db');
  const password = randomUUID();

  runSecurity(['create-keychain', '-p', password, keychainPath]);

  try {
    runSecurity(['unlock-keychain', '-p', password, keychainPath]);
  } catch (error) {
    runSecurity(['delete-keychain', keychainPath]);
    tree[Symbol.dispose]();

    throw error;
  }

  return {
    path: keychainPath,

    [Symbol.dispose](): void {
      try {
        runSecurity(['delete-keychain', keychainPath]);
      } finally {
        tree[Symbol.dispose]();
      }
    },
  };
}

/** A keychain holding one test's items, deleted when the scope that created it ends. */
export interface TempKeychain extends Disposable {
  /** Path of the keychain file, which every `security` call names. */
  readonly path: string;
}

// region | Helpers

/** Runs `security`, raising what it wrote where it failed, so a broken fixture is not read as a result. */
function runSecurity(args: string[]): void {
  execFileSync(SECURITY_PATH, args, { encoding: 'utf8', stdio: 'pipe' });
}

// endregion | Helpers
