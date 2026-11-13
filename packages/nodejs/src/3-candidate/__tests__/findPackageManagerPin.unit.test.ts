import path from 'node:path';

import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { findPackageManagerPin } from '../findPackageManagerPin.ts';

describe(findPackageManagerPin, () => {
  it('returns the pin of the nearest manifest declaring one, with its location', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { packageManager: 'pnpm@11.0.0' });
    tree.writeJson('packages/lib/package.json', { packageManager: 'pnpm@12.4.0' });

    expect(findPackageManagerPin(tree.resolve('packages/lib'))).toStrictEqual({
      dir: tree.resolve('packages/lib'),
      manifestPath: tree.resolve('packages/lib/package.json'),
      spec: 'pnpm@12.4.0',
    });
  });

  it('passes over a nearer manifest that declares no pin', () => {
    using tree = createTempTree({ 'packages/lib/src/index.ts': '' });
    tree.writeJson('package.json', { packageManager: 'pnpm@12.4.0' });
    tree.writeJson('packages/lib/package.json', { name: 'lib' });

    expect(findPackageManagerPin(tree.resolve('packages/lib/src'))?.manifestPath).toBe(tree.resolve('package.json'));
  });

  it('returns undefined when no manifest in reach declares a pin', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'unpinned' });

    expect(findPackageManagerPin(tree.dir)).toBeUndefined();
  });

  it('throws an error naming a manifest that is not valid JSON', () => {
    using tree = createTempTree({ 'package.json': '{' });

    expect(() => findPackageManagerPin(tree.dir)).toThrow(`${tree.resolve('package.json')} is not valid JSON`);
  });

  it('resolves a relative start directory before ascending', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { packageManager: 'pnpm@12.4.0' });

    expect(findPackageManagerPin(path.relative(process.cwd(), tree.dir))?.dir).toBe(tree.dir);
  });
});
