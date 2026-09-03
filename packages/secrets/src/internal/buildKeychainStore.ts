import type { SecretQuery, SecretStore, WritableSecretStore } from '../3-candidate/SecretStore.ts';
import { assertStorableSecret } from './assertStorableSecret.ts';
import { parseSecurityPassword } from './parseSecurityPassword.ts';
import type { SecurityResult, SecurityRunner } from './runSecurity.ts';
import { buildDeleteArgs, buildFindArgs, buildHasArgs, buildSetArgs } from './securityCommands.ts';

const EXIT_NOT_FOUND = 44;

/**
 * Builds a store over one keychain, or over the default search list where none is named. It holds no write:
 * `security` reads a secret from stdin only where no keychain follows on the command line, so a keychain that
 * can be named is one that cannot be written to safely.
 *
 * @internal
 */
export function buildKeychainStore(run: SecurityRunner, keychain?: string): SecretStore {
  return {
    deleteSecret(query: SecretQuery): boolean {
      const result = run(buildDeleteArgs(query, keychain));
      if (result.exitCode === EXIT_NOT_FOUND) return false;

      assertSucceeded(result, 'delete the secret');

      return true;
    },

    findSecret(query: SecretQuery): string | undefined {
      const result = run(buildFindArgs(query, keychain));
      if (result.exitCode === EXIT_NOT_FOUND) return undefined;

      assertSucceeded(result, 'read the secret');

      return parseSecurityPassword(result.stderr);
    },

    hasSecret(query: SecretQuery): boolean {
      const result = run(buildHasArgs(query, keychain));
      if (result.exitCode === EXIT_NOT_FOUND) return false;

      assertSucceeded(result, 'look up the secret');

      return true;
    },
  };
}

/**
 * Builds a store over the default keychain, which is the only one a secret can be written to without passing
 * it on argv.
 *
 * @internal
 */
export function buildWritableKeychainStore(run: SecurityRunner): WritableSecretStore {
  return {
    ...buildKeychainStore(run),

    setSecret(query: SecretQuery, secret: string): void {
      assertStorableSecret(secret);

      // The prompt asks for the secret and then for a confirmation of it, reading a line for each.
      assertSucceeded(run(buildSetArgs(query), `${secret}\n${secret}\n`), 'store the secret');
    },
  };
}

// region | Helpers

/** Raises what a failed run wrote, so a keystore that could not be reached is distinct from an absent item. */
function assertSucceeded(result: SecurityResult, action: string): void {
  if (result.exitCode === 0) return;

  const detail = result.stderr.trim();

  throw new Error(`Could not ${action}. \`security\` exited ${result.exitCode}${detail === '' ? '' : `: ${detail}`}`);
}

// endregion | Helpers
