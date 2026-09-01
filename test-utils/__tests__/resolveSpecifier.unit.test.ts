import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { resolveSpecifier } from '../resolveSpecifier.ts';

describe(resolveSpecifier, () => {
  it('resolves a specifier writing the extension explicitly', () => {
    using tree = createTempDir({ 'shuffle.ts': '' });

    expect(resolveSpecifier(tree.dir, './shuffle.ts')).toBe(path.join(tree.dir, 'shuffle.ts'));
  });

  it('resolves an extensionless specifier to the TypeScript file that it names', () => {
    using tree = createTempDir({ 'shuffle.ts': '' });

    expect(resolveSpecifier(tree.dir, './shuffle')).toBe(path.join(tree.dir, 'shuffle.ts'));
  });

  it('resolves a specifier naming a directory to its index module', () => {
    using tree = createTempDir({ 'internal/index.ts': '' });

    expect(resolveSpecifier(tree.dir, './internal')).toBe(path.join(tree.dir, 'internal', 'index.ts'));
  });

  it('resolves a specifier reaching out of the importer directory', () => {
    using tree = createTempDir({ '4-release/is-object.ts': '', '2-draft/sort-keys.ts': '' });

    expect(resolveSpecifier(path.join(tree.dir, '2-draft'), '../4-release/is-object.ts')).toBe(
      path.join(tree.dir, '4-release', 'is-object.ts'),
    );
  });

  it('returns undefined for a specifier naming nothing on disk', () => {
    using tree = createTempDir({ 'shuffle.ts': '' });

    expect(resolveSpecifier(tree.dir, './missing.ts')).toBeUndefined();
  });

  it('returns undefined for a specifier naming a directory holding no index module', () => {
    using tree = createTempDir({ 'internal/helper.ts': '' });

    expect(resolveSpecifier(tree.dir, './internal')).toBeUndefined();
  });
});
