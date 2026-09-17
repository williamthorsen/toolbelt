import fs from 'node:fs';

import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { resolveNpmPackageOfBin } from '../resolveNpmPackageOfBin.ts';

describe(resolveNpmPackageOfBin, () => {
  it('names the package after node_modules in the link target', () => {
    using tree = createTempTree({});
    fs.symlinkSync('../lib/node_modules/pnpm/bin/pnpm.mjs', tree.resolve('pn'));

    expect(resolveNpmPackageOfBin(tree.resolve('pn'))).toBe('pnpm');
  });

  it('takes two segments for a scoped package', () => {
    using tree = createTempTree({});
    fs.symlinkSync('../lib/node_modules/@scope/tool/dist/cli.js', tree.resolve('tool'));

    expect(resolveNpmPackageOfBin(tree.resolve('tool'))).toBe('@scope/tool');
  });

  it('takes the first node_modules, so a nested bin names the global package', () => {
    using tree = createTempTree({});
    fs.symlinkSync('../lib/node_modules/outer/node_modules/inner/cli.js', tree.resolve('inner'));

    expect(resolveNpmPackageOfBin(tree.resolve('inner'))).toBe('outer');
  });

  it('returns undefined for a link target outside node_modules', () => {
    using tree = createTempTree({});
    fs.symlinkSync('../lib/scripts/tool.sh', tree.resolve('tool'));

    expect(resolveNpmPackageOfBin(tree.resolve('tool'))).toBeUndefined();
  });

  it('returns undefined for a plain file and for a missing path', () => {
    using tree = createTempTree({ tool: '' });

    expect(resolveNpmPackageOfBin(tree.resolve('tool'))).toBeUndefined();
    expect(resolveNpmPackageOfBin(tree.resolve('missing'))).toBeUndefined();
  });
});
