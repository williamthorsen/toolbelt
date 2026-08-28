import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { listExportedTierDirectories } from '../listExportedTierDirectories.ts';

describe(listExportedTierDirectories, () => {
  it('lists the source directory of each tier an export subpath names', () => {
    using tree = createTempDir({
      'package.json': JSON.stringify({
        exports: {
          '.': { import: './dist/esm/4-release/index.js' },
          './candidate': { import: './dist/esm/3-candidate/index.js' },
        },
      }),
      'src/3-candidate/index.ts': '',
      'src/4-release/index.ts': '',
    });

    expect(listExportedTierDirectories(tree.dir)).toStrictEqual([
      path.join(tree.dir, 'src', '3-candidate'),
      path.join(tree.dir, 'src', '4-release'),
    ]);
  });

  it('omits a tier directory no export subpath names', () => {
    using tree = createTempDir({
      'package.json': JSON.stringify({ exports: { '.': './dist/esm/4-release/index.js' } }),
      'src/0-strawman/pipe.ts': '',
      'src/4-release/index.ts': '',
    });

    expect(listExportedTierDirectories(tree.dir)).toStrictEqual([path.join(tree.dir, 'src', '4-release')]);
  });

  it('omits a named tier that has no source directory', () => {
    using tree = createTempDir({
      'package.json': JSON.stringify({ exports: { '.': './dist/esm/4-release/index.js' } }),
    });

    expect(listExportedTierDirectories(tree.dir)).toStrictEqual([]);
  });

  it('returns nothing for a workspace organized without maturity tiers', () => {
    using tree = createTempDir({
      'package.json': JSON.stringify({ exports: { '.': './src/mod.ts' } }),
      'src/mod.ts': '',
    });

    expect(listExportedTierDirectories(tree.dir)).toStrictEqual([]);
  });
});
