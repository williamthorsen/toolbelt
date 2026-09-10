import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';

const SECURITY_PATH = '/usr/bin/security';

/**
 * Whether this process can create a keychain, so a test needing one skips rather than fails where it cannot.
 * A platform holding no `security` and a sandbox denying the `securityd` lookup both land here. Probing once
 * at load keeps the cost to one keychain per file, and the guards that read it run at collection.
 *
 * @internal
 */
export const canCreateKeychain = probeKeychain();

/**
 * Creates an unlocked keychain of its own, deleted on disposal, so that no test reaches the login keychain.
 * Requires macOS.
 *
 * @internal
 */
export function createTempKeychain(): TempKeychain {
  using stack = new DisposableStack();

  // Registration order sets disposal order: The keychain is deleted before the directory that holds it.
  const tree = stack.use(createTempTree({}));
  const keychainPath = tree.resolve('probe.keychain-db');
  const password = randomUUID();

  runSecurity(['create-keychain', '-p', password, keychainPath]);
  stack.defer(() => runSecurity(['delete-keychain', keychainPath]));
  runSecurity(['unlock-keychain', '-p', password, keychainPath]);

  const resources = stack.move();

  return {
    path: keychainPath,

    [Symbol.dispose](): void {
      resources.dispose();
    },
  };
}

/** A keychain holding one test's items, deleted when the scope that created it ends. */
export interface TempKeychain extends Disposable {
  /** Path of the keychain file, which every `security` call names. */
  readonly path: string;
}

// region | Helpers

/**
 * Reduces a failure to the line naming its cause. `execFileSync` leads with the command that it ran, which
 * holds the probe keychain's password.
 */
function describeFailure(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error)).trim();
  const cause = message.split('\n').at(-1)?.trim();

  return cause === undefined || cause === '' ? 'the reason is unknown' : cause;
}

/**
 * Creates a keychain and deletes it, reporting what refused it, so a run that skips states its cause instead
 * of passing quietly. The notice goes to `process.stderr` because the runner's `silent: 'passed-only'`
 * withholds console output that no failing test claims, which is every line this probe writes.
 */
function probeKeychain(): boolean {
  try {
    createTempKeychain()[Symbol.dispose]();

    return true;
  } catch (error) {
    process.stderr.write(`Skipping the tests that need a keychain: ${describeFailure(error)}\n`);

    return false;
  }
}

/** Runs `security`, raising what it wrote where it failed, so a broken fixture is not read as a result. */
function runSecurity(args: string[]): void {
  execFileSync(SECURITY_PATH, args, { encoding: 'utf8', stdio: 'pipe' });
}

// endregion | Helpers
