import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { findPackageManagerPin } from '../findPackageManagerPin.ts';

describe(findPackageManagerPin, () => {
  it('returns the pin of the nearest manifest declaring one, with its location', () => {
    using tree = createTempTree({
      'package.json': renderManifest({ packageManager: 'pnpm@11.0.0' }),
      'packages/lib/package.json': renderManifest({ packageManager: 'pnpm@12.4.0' }),
    });

    expect(findPackageManagerPin(tree.resolve('packages/lib'))).toStrictEqual({
      dir: tree.resolve('packages/lib'),
      manifestPath: tree.resolve('packages/lib/package.json'),
      spec: 'pnpm@12.4.0',
    });
  });

  it('passes over a nearer manifest that declares no pin', () => {
    using tree = createTempTree({
      'package.json': renderManifest({ packageManager: 'pnpm@12.4.0' }),
      'packages/lib/package.json': renderManifest({ name: 'lib' }),
      'packages/lib/src/index.ts': '',
    });

    expect(findPackageManagerPin(tree.resolve('packages/lib/src'))?.manifestPath).toBe(tree.resolve('package.json'));
  });

  it('returns undefined where no manifest in reach declares a pin', () => {
    using tree = createTempTree({ 'package.json': renderManifest({ name: 'unpinned' }) });

    expect(findPackageManagerPin(tree.dir)).toBeUndefined();
  });

  it('throws on a manifest that is not valid JSON', () => {
    using tree = createTempTree({ 'package.json': '{' });

    expect(() => findPackageManagerPin(tree.dir)).toThrow(SyntaxError);
  });
});

// region | Helpers

/** Renders a `package.json` body. */
function renderManifest(fields: Record<string, unknown>): string {
  return `${JSON.stringify(fields, undefined, 2)}\n`;
}

// endregion | Helpers
