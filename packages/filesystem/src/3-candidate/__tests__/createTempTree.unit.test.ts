import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTempTree } from '../createTempTree.ts';

describe(createTempTree, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a directory for a key ending in a separator', () => {
    using tree = createTempTree({ 'app/src/': '' });

    expect(fs.statSync(tree.resolve('app/src')).isDirectory()).toBe(true);
  });

  it('creates a file holding the mapped contents for any other key', () => {
    using tree = createTempTree({ 'package.json': '{ "name": "app" }' });

    expect(fs.readFileSync(tree.resolve('package.json'), 'utf8')).toBe('{ "name": "app" }');
  });

  it('writes a byte-valued key without passing it through a text encoding', () => {
    const bytes = Uint8Array.from([0x00, 0xff, 0xfe, 0x80]);

    using tree = createTempTree({ 'logo.bin': bytes });

    expect(Uint8Array.from(fs.readFileSync(tree.resolve('logo.bin')))).toStrictEqual(bytes);
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

  it('names no single package in the default directory prefix', () => {
    using tree = createTempTree({});

    expect(path.basename(tree.dir)).toMatch(/^toolbelt-/);
  });

  it('builds the directory under a given prefix, inside the temporary directory', () => {
    using tree = createTempTree({}, { prefix: 'rdy-tsconfig-' });

    expect(path.basename(tree.dir)).toMatch(/^rdy-tsconfig-/);
    expect(path.dirname(tree.dir)).toBe(fs.realpathSync(os.tmpdir()));
  });

  // The backslash case covers the separator Windows resolves alongside `/`.
  it.each(['rdy/', 'rdy\\', '../escaped-'])('rejects the prefix %j, building nothing', (prefix) => {
    const mkdtempSyncSpy = vi.spyOn(fs, 'mkdtempSync');

    const create = () => createTempTree({}, { prefix });

    expect(create).toThrow(/contains a path separator/);
    expect(mkdtempSyncSpy).not.toHaveBeenCalled();
  });

  // Each of these joins away to the temporary directory itself or its parent, so `mkdtemp` would build a sibling.
  it.each(['', '.', '..'])('rejects the prefix %j, building nothing', (prefix) => {
    const mkdtempSyncSpy = vi.spyOn(fs, 'mkdtempSync');

    const create = () => createTempTree({}, { prefix });

    expect(create).toThrow(/names no new directory/);
    expect(mkdtempSyncSpy).not.toHaveBeenCalled();
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

  it('rejects an entry resolving outside the tree, leaving nothing on disk', () => {
    // Spy on the creation call, which is the only route to the root of a tree no handle was returned for.
    const mkdtempSyncSpy = vi.spyOn(fs, 'mkdtempSync');

    const create = () => createTempTree({ 'written.txt': 'contents', '../escaped.txt': '' });

    expect(create).toThrow(/falls outside the temporary tree/);
    expect(fs.existsSync(String(mkdtempSyncSpy.mock.results[0]?.value))).toBe(false);
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
