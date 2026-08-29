import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { listExportTargets } from '../listExportTargets.ts';

describe(listExportTargets, () => {
  it('pairs each tier entry point with the tier its path names', () => {
    using tree = createTempDir({
      'package.json': JSON.stringify({
        exports: {
          '.': { import: './dist/esm/4-release/index.js' },
          './candidate': { import: './dist/esm/3-candidate/index.js' },
        },
      }),
    });

    expect(listExportTargets(tree.dir)).toStrictEqual([
      { target: './dist/esm/4-release/index.js', tier: '4-release' },
      { target: './dist/esm/3-candidate/index.js', tier: '3-candidate' },
    ]);
  });

  it('pairs a target naming no tier with undefined', () => {
    using tree = createTempDir({
      'package.json': JSON.stringify({ exports: { './src': './src/mod.ts' } }),
    });

    expect(listExportTargets(tree.dir)).toStrictEqual([{ target: './src/mod.ts', tier: undefined }]);
  });

  it('names no tier for an entry point below a tier index', () => {
    using tree = createTempDir({
      'package.json': JSON.stringify({ exports: { '.': './dist/esm/4-release/nested/index.js' } }),
    });

    expect(listExportTargets(tree.dir)).toStrictEqual([
      { target: './dist/esm/4-release/nested/index.js', tier: undefined },
    ]);
  });

  it('returns nothing for a manifest declaring no exports', () => {
    using tree = createTempDir({ 'package.json': '{ "name": "@scope/pkg" }' });

    expect(listExportTargets(tree.dir)).toStrictEqual([]);
  });
});
