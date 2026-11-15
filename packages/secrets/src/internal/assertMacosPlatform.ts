import { SecretStoreError } from '../3-candidate/SecretStoreError.ts';

const MACOS = 'darwin';

/**
 * Rejects a platform that has no `security` command, at construction rather than at the first call, so
 * that a caller learns where its keystore is missing rather than what failed to run.
 *
 * @internal
 */
export function assertMacosPlatform(platform: string = process.platform): void {
  if (platform === MACOS) return;

  throw new SecretStoreError(
    `A keychain store needs macOS, which supplies /usr/bin/security. This platform is ${platform}.`,
  );
}
