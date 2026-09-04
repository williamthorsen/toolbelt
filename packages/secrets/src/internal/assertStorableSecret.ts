import { UnstorableSecretError } from './UnstorableSecretError.ts';

/**
 * Rejects an empty secret, which the keychain would hold as an item indistinguishable from a stray one. Every
 * other value is storable: the secret reaches `security` as hexadecimal, which carries any byte sequence.
 *
 * @internal
 */
export function assertStorableSecret(secret: string): void {
  if (secret === '') throw new UnstorableSecretError('The secret is empty.');
}
