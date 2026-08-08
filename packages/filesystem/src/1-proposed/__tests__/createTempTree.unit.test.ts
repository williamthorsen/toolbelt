import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempTree } from '../createTempTree.ts';

describe(createTempTree, () => {
  it('creates a directory for a key ending in a separator', () => {
    using tree = createTempTree({ 'app/src/': '' });

    expect(fs.statSync(tree.resolve('app/src')).isDirectory()).toBe(true);
  });

  it('creates a file holding the mapped contents for any other key', () => {
    using tree = createTempTree({ 'package.json': '{ "name": "app" }' });

    expect(fs.readFileSync(tree.resolve('package.json'), 'utf8')).toBe('{ "name": "app" }');
  });

  it('creates the intermediate directories of a nested file key', () => {
    using tree = createTempTree({ 'app/src/main.ts': 'export {};\n' });

    expect(fs.statSync(tree.resolve('app/src')).isDirectory()).toBe(true);
  });

  it('resolves the tree root through symlinks', () => {
    using tree = createTempTree({});

    expect(tree.dir).toBe(fs.realpathSync(tree.dir));
    expect(path.dirname(tree.dir)).toBe(fs.realpathSync(os.tmpdir()));
  });

  it('names no single package in the directory prefix', () => {
    using tree = createTempTree({});

    expect(path.basename(tree.dir)).toMatch(/^toolbelt-/);
  });

  it('removes the tree when the binding leaves scope', () => {
    let treeDir: string;

    {
      using tree = createTempTree({ '.git/': '' });
      treeDir = tree.dir;

      // Assert existence first, so a tree that was never created cannot pass the removal check vacuously.
      expect(fs.existsSync(treeDir)).toBe(true);
    }

    expect(fs.existsSync(treeDir)).toBe(false);
  });

  it('rejects an entry resolving outside the tree', () => {
    const create = () => createTempTree({ '../escaped.txt': '' });

    expect(create).toThrow(/falls outside the temporary tree/);
  });
});

describe('TempTree.resolve', () => {
  it('resolves segments against the tree root', () => {
    using tree = createTempTree({});

    expect(tree.resolve('app', 'src')).toBe(path.join(tree.dir, 'app/src'));
  });

  it('given no segments, returns the tree root', () => {
    using tree = createTempTree({});

    expect(tree.resolve()).toBe(tree.dir);
  });

  it('returns an absolute segment that lands inside the tree', () => {
    using tree = createTempTree({});

    expect(tree.resolve(path.join(tree.dir, 'app'))).toBe(path.join(tree.dir, 'app'));
  });

  it('throws on a relative segment that would ascend out of the tree', () => {
    using tree = createTempTree({});

    const resolve = () => tree.resolve('..');

    expect(resolve).toThrow(/falls outside the temporary tree/);
  });

  it('throws on an absolute segment outside the tree', () => {
    using tree = createTempTree({});

    const resolve = () => tree.resolve(os.tmpdir());

    expect(resolve).toThrow(/falls outside the temporary tree/);
  });
});
