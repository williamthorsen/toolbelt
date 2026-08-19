import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTempDir } from '../createTempDir.ts';

describe(createTempDir, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a file holding the mapped contents, intermediate directories included', () => {
    using tree = createTempDir({ 'src/nested/main.ts': 'export {};\n' });

    expect(fs.readFileSync(path.join(tree.dir, 'src/nested/main.ts'), 'utf8')).toBe('export {};\n');
  });

  it('resolves the directory root through symlinks, which is what a walk compares against', () => {
    using tree = createTempDir({});

    expect(tree.dir).toBe(fs.realpathSync(tree.dir));
    expect(path.dirname(tree.dir)).toBe(fs.realpathSync(os.tmpdir()));
  });

  it('removes the directory when the binding leaves scope', () => {
    let treeDir: string;

    {
      using tree = createTempDir({ 'package.json': '{}' });
      treeDir = tree.dir;

      // Assert existence first, so a directory that was never created cannot pass the removal check vacuously.
      expect(fs.existsSync(treeDir)).toBe(true);
    }

    expect(fs.existsSync(treeDir)).toBe(false);
  });

  it('rejects a key naming a directory, leaving nothing on disk', () => {
    // Spy on the creation call, the only route to the root of a directory no handle was returned for. The
    // call-count assertion keeps a spy that recorded nothing from passing the removal check vacuously.
    const mkdtempSyncSpy = vi.spyOn(fs, 'mkdtempSync');

    // The rejected key follows a written one, so the removal covers an entry already on disk.
    const create = () => createTempDir({ 'package.json': '{}', 'nested/': '' });

    expect(create).toThrow('names a directory');
    expect(mkdtempSyncSpy).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(String(mkdtempSyncSpy.mock.results[0]?.value))).toBe(false);
  });
});
