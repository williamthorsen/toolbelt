import { describe, expect, it } from 'vitest';

import { parsePackageManagerSpec } from '../parsePackageManagerSpec.ts';

describe(parsePackageManagerSpec, () => {
  it('splits a bare version into name and version, with no hash', () => {
    expect(parsePackageManagerSpec('pnpm@12.4.0')).toStrictEqual({ hash: undefined, name: 'pnpm', version: '12.4.0' });
  });

  it('takes the hash after the first plus, keeping any plus inside it', () => {
    expect(parsePackageManagerSpec('pnpm@10.15.0+sha512.abc+def==')).toStrictEqual({
      hash: 'sha512.abc+def==',
      name: 'pnpm',
      version: '10.15.0',
    });
  });

  it('parses a scoped name, whose leading at-sign is not the separator', () => {
    expect(parsePackageManagerSpec('@scope/manager@1.0.0')?.name).toBe('@scope/manager');
  });

  it.each(['pnpm', '@12.4.0', 'pnpm@', 'pnpm@+sha512.abc', ''])(
    'returns undefined for a malformed value: %j',
    (spec) => {
      expect(parsePackageManagerSpec(spec)).toBeUndefined();
    },
  );
});
