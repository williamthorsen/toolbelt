import fs from 'node:fs';

import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { resolveNpmPackageOfBin } from '../resolveNpmPackageOfBin.ts';

describe(resolveNpmPackageOfBin, () => {
  it.each([
    { title: 'names the package after node_modules', target: '../lib/node_modules/pnpm/bin/pnpm.mjs', name: 'pnpm' },
    {
      title: 'takes two segments for a scoped package',
      target: '../lib/node_modules/@scope/tool/dist/cli.js',
      name: '@scope/tool',
    },
    {
      title: 'takes the first node_modules, so a nested bin names the global package',
      target: '../lib/node_modules/outer/node_modules/inner/cli.js',
      name: 'outer',
    },
  ])('$title: $target', ({ target, name }) => {
    using tree = createTempTree({});
    fs.symlinkSync(target, tree.resolve('bin'));

    expect(resolveNpmPackageOfBin(tree.resolve('bin'))).toBe(name);
  });

  it.each([
    { title: 'a target outside node_modules', target: '../lib/scripts/tool.sh' },
    { title: 'a target that ends at node_modules/', target: '../lib/node_modules/' },
    { title: 'a scope without a name', target: '../lib/node_modules/@scope' },
    { title: 'a scope followed by an empty name', target: '../lib/node_modules/@scope/' },
  ])('returns undefined for $title: $target', ({ target }) => {
    using tree = createTempTree({});
    fs.symlinkSync(target, tree.resolve('bin'));

    expect(resolveNpmPackageOfBin(tree.resolve('bin'))).toBeUndefined();
  });

  it('returns undefined for a plain file and for a missing path', () => {
    using tree = createTempTree({ tool: '' });

    expect(resolveNpmPackageOfBin(tree.resolve('tool'))).toBeUndefined();
    expect(resolveNpmPackageOfBin(tree.resolve('missing'))).toBeUndefined();
  });
});
