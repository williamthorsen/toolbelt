import { assertMacosPlatform } from '../internal/assertMacosPlatform.ts';
import { buildKeychainStore, buildWritableKeychainStore } from '../internal/buildKeychainStore.ts';
import { runSecurity } from '../internal/runSecurity.ts';
import type { SecretStore, WritableSecretStore } from './SecretStore.ts';

/**
 * Opens the macOS default keychain, the one keychain a secret can be written to without passing it on argv,
 * where any process may read it. Throws off macOS.
 *
 * @category Secrets
 * @experimental
 * @stage candidate
 */
export function createKeychainStore(): WritableSecretStore;

/**
 * Opens the keychain at a path. A secret cannot be written there: `security` reads a secret from stdin only
 * where no keychain follows on the command line, so the returned store reads and deletes alone. Throws off
 * macOS.
 *
 * @category Secrets
 * @experimental
 * @stage candidate
 */
export function createKeychainStore(options: KeychainStoreOptions): SecretStore;

export function createKeychainStore(options?: KeychainStoreOptions): SecretStore {
  assertMacosPlatform();

  if (options === undefined) return buildWritableKeychainStore(runSecurity);

  return buildKeychainStore(runSecurity, options.keychain);
}

export interface KeychainStoreOptions {
  /** Path of the keychain to open, such as `~/Library/Keychains/project.keychain-db`, expanded by the caller. */
  readonly keychain: string;
}
