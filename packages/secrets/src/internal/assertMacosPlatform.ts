const MACOS = 'darwin';

/**
 * Rejects a platform that ships no `security` command, at construction rather than at the first call, so a
 * caller learns where its keystore is missing rather than what failed to run.
 *
 * @internal
 */
export function assertMacosPlatform(platform: string = process.platform): void {
  if (platform === MACOS) return;

  throw new Error(`A keychain store needs macOS, which supplies /usr/bin/security. This platform is ${platform}.`);
}
