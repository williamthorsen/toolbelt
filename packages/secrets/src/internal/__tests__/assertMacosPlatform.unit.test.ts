import { captureError } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { SecretStoreError } from '../../3-candidate/SecretStoreError.ts';
import { assertMacosPlatform } from '../assertMacosPlatform.ts';

describe(assertMacosPlatform, () => {
  it('accepts macOS', () => {
    expect(() => assertMacosPlatform('darwin')).not.toThrow();
  });

  it.each([['linux'], ['win32']])('names the platform that it rejects: %s', async (platform) => {
    expect((await captureError(SecretStoreError, () => assertMacosPlatform(platform))).message).toMatch(
      new RegExp(String.raw`This platform is ${platform}\.`),
    );
  });
});
