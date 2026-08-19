import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';

describe(createTempDir, () => {
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

  it('rejects a key naming a directory', () => {
    expect(() => createTempDir({ 'nested/': '' })).toThrow('names a directory');
  });

  it('leaves nothing on disk when an entry write throws', () => {
    const before = fs.readdirSync(fs.realpathSync(os.tmpdir())).filter((name) => name.startsWith('toolbelt-root-'));

    expect(() => createTempDir({ 'nested/': '' })).toThrow('names a directory');

    const after = fs.readdirSync(fs.realpathSync(os.tmpdir())).filter((name) => name.startsWith('toolbelt-root-'));
    expect(after).toStrictEqual(before);
  });
});
