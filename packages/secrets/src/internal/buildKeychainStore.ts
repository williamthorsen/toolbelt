import type { SecretQuery, WritableSecretStore } from '../3-candidate/SecretStore.ts';
import { assertStorableSecret } from './assertStorableSecret.ts';
import { parseSecurityPassword } from './parseSecurityPassword.ts';
import type { SecurityResult, SecurityRunner } from './runSecurity.ts';
import { buildDeleteArgs, buildFindArgs, buildHasArgs, composeSetLine } from './securityCommands.ts';

const EXIT_NOT_FOUND = 44;
const INTERACTIVE_ARGS = ['-i'];

/**
 * Builds a store over one keychain, or over the default search list where none is named.
 *
 * @internal
 */
export function buildKeychainStore(run: SecurityRunner, keychain?: string): WritableSecretStore {
  function findSecret(query: SecretQuery): string | undefined {
    const result = run(buildFindArgs(query, keychain));
    if (result.exitCode === EXIT_NOT_FOUND) return undefined;

    assertSucceeded(result, 'read the secret');

    return parseSecurityPassword(result.stderr);
  }

  return {
    deleteSecret(query: SecretQuery): boolean {
      const result = run(buildDeleteArgs(query, keychain));
      if (result.exitCode === EXIT_NOT_FOUND) return false;

      assertSucceeded(result, 'delete the secret');

      return true;
    },

    findSecret,

    hasSecret(query: SecretQuery): boolean {
      const result = run(buildHasArgs(query, keychain));
      if (result.exitCode === EXIT_NOT_FOUND) return false;

      assertSucceeded(result, 'look up the secret');

      return true;
    },

    setSecret(query: SecretQuery, secret: string): void {
      assertStorableSecret(secret);

      const line = composeSetLine(query, secret, keychain);
      assertSucceeded(run(INTERACTIVE_ARGS, `${line}\n`), 'store the secret');

      assertStoredIntact(findSecret(query), secret);
    },
  };
}

// region | Helpers

/**
 * Raises a stored secret that differs from the one written. `security` reads a command line into a fixed
 * buffer, so a version whose buffer is smaller than this one accounts for would cut the secret; comparing
 * what came back is what turns that into a failure at the write rather than a wrong answer at the caller.
 */
function assertStoredIntact(stored: string | undefined, secret: string): void {
  if (stored === secret) return;

  const found = stored === undefined ? 'nothing was stored' : `${stored.length} characters came back`;

  throw new Error(`The secret was written but not stored intact: ${secret.length} characters went in and ${found}.`);
}

/** Raises what a failed run wrote, so a keystore that could not be reached is distinct from an absent item. */
function assertSucceeded(result: SecurityResult, action: string): void {
  if (result.exitCode === 0) return;

  const detail = result.stderr.trim();

  throw new Error(`Could not ${action}. \`security\` exited ${result.exitCode}${detail === '' ? '' : `: ${detail}`}`);
}

// endregion | Helpers
