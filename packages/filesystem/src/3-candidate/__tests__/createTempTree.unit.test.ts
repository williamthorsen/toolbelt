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

  // Requires a non-root process: root unlinks regardless of the directory's permission bits, and the case then
  // passes whether or not disposal restores them.
  it('removes a tree whose root has been made unwritable', () => {
    let treeDir: string;

    {
      using tree = createTempTree({ 'packages/app/package.json': '{}' });
      treeDir = tree.dir;
      fs.chmodSync(treeDir, 0o500);
    }

    expect(fs.existsSync(treeDir)).toBe(false);
  });

  it('removes a tree whose nested directory has been made unwritable', () => {
    let treeDir: string;

    {
      using tree = createTempTree({ 'packages/app/package.json': '{}' });
      treeDir = tree.dir;
      fs.chmodSync(tree.resolve('packages/app'), 0o500);
    }

    expect(fs.existsSync(treeDir)).toBe(false);
  });

  // A directory denying its own listing is what separates chmodding each directory before reading it from after.
  it('removes a tree whose nested directory denies its own listing', () => {
    let treeDir: string;

    {
      using tree = createTempTree({ 'packages/app/package.json': '{}' });
      treeDir = tree.dir;
      fs.chmodSync(tree.resolve('packages/app'), 0o000);
    }

    expect(fs.existsSync(treeDir)).toBe(false);
  });

  it('disposes a second time without throwing', () => {
    const tree = createTempTree({ '.git/': '' });
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's `Symbol` list omits `dispose`, standard since ES2026.
    const dispose = () => tree[Symbol.dispose]();

    dispose();

    expect(dispose).not.toThrow();
  });

  it('rejects an entry resolving outside the tree, leaving nothing on disk', () => {
    // Spy on the creation call, which is the only route to the root of a tree no handle was returned for.
    const mkdtempSyncSpy = vi.spyOn(fs, 'mkdtempSync');

    const create = () => createTempTree({ 'written.txt': 'contents', '../escaped.txt': '' });

    expect(create).toThrow(/falls outside the temporary tree/);
    expect(fs.existsSync(String(mkdtempSyncSpy.mock.results[0]?.value))).toBe(false);
  });
});

describe('TempTree.exists', () => {
  it('answers true for a written file and false for a missing entry', () => {
    using tree = createTempTree({ 'package.json': '{}' });

    expect(tree.exists('package.json')).toBe(true);
    expect(tree.exists('absent.json')).toBe(false);
  });

  it('answers false for a dangling link, following it rather than reading the link itself', () => {
    using tree = createTempTree({});
    tree.symlink('link.json', 'absent.json');

    expect(tree.exists('link.json')).toBe(false);
  });

  it('throws on a path that would ascend out of the tree', () => {
    using tree = createTempTree({});

    const exists = () => tree.exists('../escaped.txt');

    expect(exists).toThrow(/falls outside the temporary tree/);
  });
});

describe('TempTree.list', () => {
  it('lists the names directly inside a directory, sorted', () => {
    using tree = createTempTree({ 'app/b.ts': '', 'app/a.ts': '', 'app/nested/c.ts': '' });

    expect(tree.list('app')).toStrictEqual(['a.ts', 'b.ts', 'nested']);
  });

  it('given no path, lists the tree root', () => {
    using tree = createTempTree({ '.git/': '', 'package.json': '{}' });

    expect(tree.list()).toStrictEqual(['.git', 'package.json']);
  });

  it('throws on a directory that does not exist', () => {
    using tree = createTempTree({});

    const list = () => tree.list('absent');

    expect(list).toThrow(/ENOENT/);
  });

  it('throws on a path that would ascend out of the tree', () => {
    using tree = createTempTree({});

    const list = () => tree.list('..');

    expect(list).toThrow(/falls outside the temporary tree/);
  });
});

describe('TempTree.mkdir', () => {
  it('creates the directory and its parents', () => {
    using tree = createTempTree({});

    tree.mkdir('node_modules/@acme/kits/.readyup');

    expect(fs.statSync(tree.resolve('node_modules/@acme/kits/.readyup')).isDirectory()).toBe(true);
  });

  it('returns the absolute path of the directory', () => {
    using tree = createTempTree({});

    expect(tree.mkdir('packages/empty')).toBe(path.join(tree.dir, 'packages/empty'));
  });

  it('leaves an existing directory and its contents in place', () => {
    using tree = createTempTree({ 'packages/app/package.json': '{}' });

    tree.mkdir('packages/app');

    expect(fs.readFileSync(tree.resolve('packages/app/package.json'), 'utf8')).toBe('{}');
  });

  it('throws on a path that would ascend out of the tree', () => {
    using tree = createTempTree({});

    const mkdir = () => tree.mkdir('../escaped');

    expect(mkdir).toThrow(/falls outside the temporary tree/);
  });
});

describe('TempTree.read', () => {
  it('reads a written file as text', () => {
    using tree = createTempTree({ 'package.json': '{ "name": "app" }' });

    expect(tree.read('package.json')).toBe('{ "name": "app" }');
  });

  it('throws on a file that does not exist', () => {
    using tree = createTempTree({});

    const read = () => tree.read('absent.json');

    expect(read).toThrow(/ENOENT/);
  });

  it('throws on a path that would ascend out of the tree', () => {
    using tree = createTempTree({});

    const read = () => tree.read('../escaped.txt');

    expect(read).toThrow(/falls outside the temporary tree/);
  });
});

describe('TempTree.readJson', () => {
  it('round-trips a value written by writeJson', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'app', private: true });

    expect(tree.readJson('package.json')).toStrictEqual({ name: 'app', private: true });
  });

  it('names the entry when the contents do not parse', () => {
    using tree = createTempTree({ 'package.json': '{ "name": ' });

    const readJson = () => tree.readJson('package.json');

    expect(readJson).toThrow(/Entry "package.json" is not readable as JSON/);
  });

  it('throws on a file that does not exist', () => {
    using tree = createTempTree({});

    const readJson = () => tree.readJson('absent.json');

    expect(readJson).toThrow(/ENOENT/);
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

describe('TempTree.rm', () => {
  it('removes a file', () => {
    using tree = createTempTree({ 'package.json': '{}' });

    tree.rm('package.json');

    expect(tree.exists('package.json')).toBe(false);
  });

  it('removes a populated directory without options given', () => {
    using tree = createTempTree({ 'packages/app/package.json': '{}' });

    tree.rm('packages');

    expect(tree.exists('packages')).toBe(false);
  });

  it('is silent on an entry that does not exist', () => {
    using tree = createTempTree({});

    expect(() => tree.rm('absent.json')).not.toThrow();
  });

  it('throws on a path that would ascend out of the tree', () => {
    using tree = createTempTree({});

    const rm = () => tree.rm('../escaped.txt');

    expect(rm).toThrow(/falls outside the temporary tree/);
  });
});

describe('TempTree.symlink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links to a directory target, reaching its contents through the link', () => {
    using tree = createTempTree({ 'store/kit/package.json': '{ "name": "kit" }' });

    tree.symlink('node_modules/kit', '../store/kit');

    expect(fs.readFileSync(tree.resolve('node_modules/kit/package.json'), 'utf8')).toBe('{ "name": "kit" }');
  });

  it('links to a file target, reading its contents through the link', () => {
    using tree = createTempTree({ 'real.json': 'real\n' });

    tree.symlink('link.json', 'real.json');

    expect(fs.readFileSync(tree.resolve('link.json'), 'utf8')).toBe('real\n');
  });

  it('creates the parents of the link', () => {
    using tree = createTempTree({ 'store/kit/': '' });

    tree.symlink('nested/node_modules/kit', 'store/kit');

    expect(fs.lstatSync(tree.resolve('nested/node_modules/kit')).isSymbolicLink()).toBe(true);
  });

  it('returns the absolute path of the link', () => {
    using tree = createTempTree({ 'real.json': 'real\n' });

    expect(tree.symlink('link.json', 'real.json')).toBe(path.join(tree.dir, 'link.json'));
  });

  it('links a target that does not exist, leaving the link dangling', () => {
    using tree = createTempTree({});

    const linkPath = tree.symlink('link.json', 'absent.json');

    expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
    expect(fs.existsSync(linkPath)).toBe(false);
  });

  // Read rather than followed, because a consumer hashing the link's target depends on the stored string.
  it('stores a relative target verbatim', () => {
    using tree = createTempTree({ 'store/kit/': '' });

    const linkPath = tree.symlink('node_modules/kit', '../store/kit');

    expect(fs.readlinkSync(linkPath)).toBe('../store/kit');
  });

  it('stores an absolute target verbatim', () => {
    using tree = createTempTree({ 'store/kit/': '' });

    const linkPath = tree.symlink('node_modules/kit', tree.resolve('store/kit'));

    expect(fs.readlinkSync(linkPath)).toBe(tree.resolve('store/kit'));
  });

  it('links a target outside the tree, reaching it through the link', () => {
    using outside = createTempTree({ 'kit/package.json': '{ "name": "kit" }' });
    using tree = createTempTree({});

    const linkPath = tree.symlink('node_modules/kit', outside.resolve('kit'));

    expect(fs.readlinkSync(linkPath)).toBe(outside.resolve('kit'));
    expect(fs.readFileSync(tree.resolve('node_modules/kit/package.json'), 'utf8')).toBe('{ "name": "kit" }');
  });

  it('throws on a link path that is already occupied', () => {
    using tree = createTempTree({ 'real.json': 'real\n' });
    tree.symlink('link.json', 'real.json');

    const relink = () => tree.symlink('link.json', 'real.json');

    expect(relink).toThrow(/EEXIST/);
  });

  // The link type is the argument Windows reads and every other platform ignores, so a spy is the only way to
  // observe the choice from a POSIX run.
  describe('link type', () => {
    it('links an absolute directory target as a junction', () => {
      const symlinkSyncSpy = vi.spyOn(fs, 'symlinkSync');
      using tree = createTempTree({ 'store/kit/': '' });

      tree.symlink('link', tree.resolve('store/kit'));

      expect(symlinkSyncSpy).toHaveBeenCalledWith(tree.resolve('store/kit'), tree.resolve('link'), 'junction');
    });

    // The link is nested, so the target resolves only if it is taken against the link's own directory.
    it('links a relative directory target as a directory', () => {
      const symlinkSyncSpy = vi.spyOn(fs, 'symlinkSync');
      using tree = createTempTree({ 'store/kit/': '' });

      tree.symlink('node_modules/kit', '../store/kit');

      expect(symlinkSyncSpy).toHaveBeenCalledWith('../store/kit', tree.resolve('node_modules/kit'), 'dir');
    });

    it('links a file target as a file', () => {
      const symlinkSyncSpy = vi.spyOn(fs, 'symlinkSync');
      using tree = createTempTree({ 'real.json': 'real\n' });

      tree.symlink('link', 'real.json');

      expect(symlinkSyncSpy).toHaveBeenCalledWith('real.json', tree.resolve('link'), 'file');
    });

    it('links a target that does not exist as a file', () => {
      const symlinkSyncSpy = vi.spyOn(fs, 'symlinkSync');
      using tree = createTempTree({});

      tree.symlink('link', 'absent.json');

      expect(symlinkSyncSpy).toHaveBeenCalledWith('absent.json', tree.resolve('link'), 'file');
    });
  });

  it('throws on a link path that would ascend out of the tree', () => {
    using tree = createTempTree({ 'real.json': 'real\n' });

    const symlink = () => tree.symlink('../escaped.json', 'real.json');

    expect(symlink).toThrow(/falls outside the temporary tree/);
  });
});

describe('TempTree.write', () => {
  it('writes the contents and returns the absolute path', () => {
    using tree = createTempTree({});

    const filePath = tree.write('package.json', '{ "name": "app" }');

    expect(filePath).toBe(path.join(tree.dir, 'package.json'));
    expect(fs.readFileSync(filePath, 'utf8')).toBe('{ "name": "app" }');
  });

  it('creates the parents of the file', () => {
    using tree = createTempTree({});

    tree.write('packages/app/src/main.ts', 'export {};\n');

    expect(fs.statSync(tree.resolve('packages/app/src')).isDirectory()).toBe(true);
  });

  it('writes byte contents without passing them through a text encoding', () => {
    const bytes = Uint8Array.from([0x00, 0xff, 0xfe, 0x80]);
    using tree = createTempTree({});

    const filePath = tree.write('logo.bin', bytes);

    expect(Uint8Array.from(fs.readFileSync(filePath))).toStrictEqual(bytes);
  });

  it('replaces the contents of an existing file', () => {
    using tree = createTempTree({ 'package.json': '{ "name": "old" }' });

    const filePath = tree.write('package.json', '{ "name": "new" }');

    expect(fs.readFileSync(filePath, 'utf8')).toBe('{ "name": "new" }');
  });

  it('throws on a path that would ascend out of the tree', () => {
    using tree = createTempTree({});

    const write = () => tree.write('../escaped.txt', 'contents');

    expect(write).toThrow(/falls outside the temporary tree/);
  });
});

describe('TempTree.writeAll', () => {
  it('creates a directory for a key ending in a separator and a file for any other', () => {
    using tree = createTempTree({});

    tree.writeAll({ 'app/src/': '', 'package.json': '{ "name": "app" }' });

    expect(fs.statSync(tree.resolve('app/src')).isDirectory()).toBe(true);
    expect(fs.readFileSync(tree.resolve('package.json'), 'utf8')).toBe('{ "name": "app" }');
  });

  it('writes byte contents without passing them through a text encoding', () => {
    const bytes = Uint8Array.from([0x00, 0xff, 0xfe, 0x80]);
    using tree = createTempTree({});

    tree.writeAll({ 'logo.bin': bytes });

    expect(Uint8Array.from(fs.readFileSync(tree.resolve('logo.bin')))).toStrictEqual(bytes);
  });

  it('replaces the contents of an existing file', () => {
    using tree = createTempTree({ 'package.json': '{ "name": "old" }' });

    tree.writeAll({ 'package.json': '{ "name": "new" }' });

    expect(fs.readFileSync(tree.resolve('package.json'), 'utf8')).toBe('{ "name": "new" }');
  });

  it('throws on a key that would ascend out of the tree, leaving the tree standing', () => {
    using tree = createTempTree({ 'kept.txt': 'kept' });

    const writeAll = () => tree.writeAll({ '../escaped.txt': '' });

    expect(writeAll).toThrow(/falls outside the temporary tree/);
    expect(fs.readFileSync(tree.resolve('kept.txt'), 'utf8')).toBe('kept');
  });
});

describe('TempTree.writeJson', () => {
  it('writes two-space-indented JSON ending in a newline', () => {
    using tree = createTempTree({});

    const filePath = tree.writeJson('package.json', { name: 'app', private: true });

    expect(fs.readFileSync(filePath, 'utf8')).toBe('{\n  "name": "app",\n  "private": true\n}\n');
  });

  it('returns the absolute path and creates the parents of the file', () => {
    using tree = createTempTree({});

    expect(tree.writeJson('packages/app/package.json', { name: 'app' })).toBe(
      path.join(tree.dir, 'packages/app/package.json'),
    );
  });

  it('throws on a path that would ascend out of the tree', () => {
    using tree = createTempTree({});

    const writeJson = () => tree.writeJson('../escaped.json', { name: 'app' });

    expect(writeJson).toThrow(/falls outside the temporary tree/);
  });

  // An optional binding that arrived empty is the route in, and `unknown` accepts it without complaint.
  it('throws on an undefined value, writing no file', () => {
    using tree = createTempTree({});

    const writeJson = () => tree.writeJson('package.json', undefined);

    expect(writeJson).toThrow(/Value of type "undefined" .* has no JSON representation/);
    expect(fs.existsSync(tree.resolve('package.json'))).toBe(false);
  });

  it('throws on a function value, writing no file', () => {
    using tree = createTempTree({});

    const writeJson = () => tree.writeJson('package.json', () => undefined);

    expect(writeJson).toThrow(/Value of type "function" .* has no JSON representation/);
    expect(fs.existsSync(tree.resolve('package.json'))).toBe(false);
  });
});
