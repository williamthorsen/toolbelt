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

  it('resolves the directory root through symlinks, which is what a sweep compares against', () => {
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

  // `createTempTree` reads a key ending in a separator as a directory. Without this rejection, a caller
  // carrying that idiom over would get a file of the same name and no error.
  it('rejects an entry naming a directory, leaving nothing on disk', () => {
    // Spy on the creation call, which is the only route to the root of a directory no handle was returned for.
    using mkdtempSyncSpy = vi.spyOn(fs, 'mkdtempSync');

    const create = () => createTempDir({ 'package.json': '{}', 'src/': '' });

    expect(create).toThrow(/names a directory/);
    expect(fs.existsSync(String(mkdtempSyncSpy.mock.results[0]?.value))).toBe(false);
  });
});
