import { UnstorableSecretError } from '../3-candidate/UnstorableSecretError.ts';

/**
 * Rejects an empty secret, which the keychain would hold as an item indistinguishable from a stray one. Every
 * other value is storable: The secret reaches `security` as hexadecimal, which encodes any byte sequence.
 *
 * @internal
 */
export function assertStorableSecret(secret: string): void {
  if (secret === '') throw new UnstorableSecretError('The secret is empty.');
}
