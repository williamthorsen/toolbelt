import { assertMacosPlatform } from '../internal/assertMacosPlatform.ts';
import { buildKeychainStore } from '../internal/buildKeychainStore.ts';
import { runSecurity } from '../internal/runSecurity.ts';
import type { WritableSecretStore } from './SecretStore.ts';

/**
 * Opens a macOS keychain as a secret store, or the default search list where no keychain is named. Throws off
 * macOS.
 *
 * @category Secrets
 * @experimental
 * @stage candidate
 */
export function createKeychainStore(options?: KeychainStoreOptions): WritableSecretStore {
  assertMacosPlatform();

  return buildKeychainStore(runSecurity, options?.keychain);
}

export interface KeychainStoreOptions {
  /** Path of the keychain to open, such as `~/Library/Keychains/project.keychain-db`, expanded by the caller. */
  readonly keychain: string;
}
