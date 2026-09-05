import { describe, expect, it } from 'vitest';

import { assertMacosPlatform } from '../assertMacosPlatform.ts';

describe(assertMacosPlatform, () => {
  it('accepts macOS', () => {
    expect(() => assertMacosPlatform('darwin')).not.toThrow();
  });

  it.each([['linux'], ['win32']])('names the platform that it rejects: %s', (platform) => {
    expect(() => assertMacosPlatform(platform)).toThrow(new RegExp(String.raw`This platform is ${platform}\.`));
  });
});
