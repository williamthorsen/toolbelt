import type { SecretQuery } from '../3-candidate/SecretStore.ts';

/**
 * Builds the arguments that delete a secret.
 *
 * @internal
 */
export function buildDeleteArgs(query: SecretQuery, keychain?: string): string[] {
  return ['delete-generic-password', ...itemArgs(query), ...keychainArgs(keychain)];
}

/**
 * Builds the arguments that read a secret. `-g` is what prints it, in the two forms that
 * `parseSecurityPassword` reads.
 *
 * @internal
 */
export function buildFindArgs(query: SecretQuery, keychain?: string): string[] {
  return ['find-generic-password', ...itemArgs(query), '-g', ...keychainArgs(keychain)];
}

/**
 * Builds the arguments that report whether a secret is stored. Without `-g` the command reads the item's
 * attributes alone, so it never retrieves the secret and cannot raise a keychain access prompt.
 *
 * @internal
 */
export function buildHasArgs(query: SecretQuery, keychain?: string): string[] {
  return ['find-generic-password', ...itemArgs(query), ...keychainArgs(keychain)];
}

/**
 * Builds the arguments that store a secret. A trailing `-w` carrying no value is what makes `security` read
 * the secret from stdin rather than from argv, and it stays last for that reason: where an argument follows,
 * `-w` takes it as the secret, which is why no keychain can be named here.
 *
 * @internal
 */
export function buildSetArgs(query: SecretQuery): string[] {
  return ['add-generic-password', '-U', ...itemArgs(query), '-w'];
}

// region | Helpers

/**
 * Names the item to act on. The account is always passed, carrying the empty string where the caller gave
 * none, since a match on the service alone answers with an arbitrary one of the items holding it.
 */
function itemArgs({ account = '', service }: SecretQuery): string[] {
  return ['-a', account, '-s', service];
}

/** Names the keychain to act on, or nothing, which leaves `security` to use the default search list. */
function keychainArgs(keychain: string | undefined): string[] {
  return keychain === undefined ? [] : [keychain];
}

// endregion | Helpers
