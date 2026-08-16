import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTempTree } from '../../3-candidate/createTempTree.ts';
import { writeAtomic } from '../writeAtomic.ts';

describe(writeAtomic, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful writes', () => {
    it('creates a file that does not exist', async () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('config.json');

      await writeAtomic(filePath, '{}\n');

      expect(fs.readFileSync(filePath, 'utf8')).toBe('{}\n');
    });

    it('replaces an existing file', async () => {
      using tree = createTempTree({ 'config.json': 'old\n' });
      const filePath = tree.resolve('config.json');

      await writeAtomic(filePath, 'new\n');

      expect(fs.readFileSync(filePath, 'utf8')).toBe('new\n');
    });

    it('writes the bytes of a Uint8Array unchanged', async () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('logo.bin');
      const bytes = new Uint8Array([0x00, 0x9f, 0x92, 0x96]);

      await writeAtomic(filePath, bytes);

      expect(new Uint8Array(fs.readFileSync(filePath))).toStrictEqual(bytes);
    });

    it('creates missing parent directories', async () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('.agents/state/manifest.json');

      await writeAtomic(filePath, '{}\n');

      expect(fs.readFileSync(filePath, 'utf8')).toBe('{}\n');
    });

    it('leaves no temp file behind', async () => {
      using tree = createTempTree({});

      await writeAtomic(tree.resolve('config.json'), '{}\n');

      expect(fs.readdirSync(tree.dir)).toStrictEqual(['config.json']);
    });

    it('lands each of two concurrent writes to one target whole', async () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('config.json');

      await Promise.all([writeAtomic(filePath, 'first\n'), writeAtomic(filePath, 'second\n')]);

      expect(['first\n', 'second\n']).toContain(fs.readFileSync(filePath, 'utf8'));
      expect(fs.readdirSync(tree.dir)).toStrictEqual(['config.json']);
    });
  });

  describe('file mode', () => {
    it('preserves the mode of a private target', async () => {
      using tree = createTempTree({ 'creds.json': '{}\n' });
      const filePath = tree.resolve('creds.json');
      fs.chmodSync(filePath, 0o600);

      await writeAtomic(filePath, '{"token":"secret"}\n');

      expect(fs.statSync(filePath).mode & 0o777).toBe(0o600);
    });

    // The umask clears the group and other bits at creation, so a permissive mode is what exercises the chmod
    // that restores them.
    it('preserves the mode of a group-writable target', async () => {
      using tree = createTempTree({ 'shared.json': '{}\n' });
      const filePath = tree.resolve('shared.json');
      fs.chmodSync(filePath, 0o664);

      await writeAtomic(filePath, '{"shared":true}\n');

      expect(fs.statSync(filePath).mode & 0o777).toBe(0o664);
    });

    // Compared against a control write rather than a literal, because the default depends on the runner's umask.
    it('gives a new file the same mode a plain write would', async () => {
      using tree = createTempTree({});
      const controlPath = tree.write('control.json', '{}\n');
      const filePath = tree.resolve('config.json');

      await writeAtomic(filePath, '{}\n');

      expect(fs.statSync(filePath).mode & 0o777).toBe(fs.statSync(controlPath).mode & 0o777);
    });
  });

  it('replaces a symlink at the target instead of writing through it', async () => {
    using tree = createTempTree({ 'real.json': 'real\n' });
    const linkPath = tree.symlink('link.json', 'real.json');

    await writeAtomic(linkPath, 'new\n');

    expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(false);
    expect(fs.readFileSync(linkPath, 'utf8')).toBe('new\n');
    expect(fs.readFileSync(tree.resolve('real.json'), 'utf8')).toBe('real\n');
  });

  describe('failures', () => {
    // Requires a non-root process: root writes regardless of the directory's permission bits, and this then
    // fails loudly rather than passing.
    it('surfaces a write failure, leaving no temp file', async () => {
      using tree = createTempTree({ 'locked/': '' });
      const dir = tree.resolve('locked');
      fs.chmodSync(dir, 0o555);

      try {
        await expect(writeAtomic(tree.resolve('locked/config.json'), '{}\n')).rejects.toThrow(/EACCES/);
        expect(fs.readdirSync(dir)).toStrictEqual([]);
      } finally {
        fs.chmodSync(dir, 0o755);
      }
    });

    it('surfaces a rename failure, removing the temp file', async () => {
      using tree = createTempTree({ 'target/keep.txt': 'keep\n' });
      const filePath = tree.resolve('target');

      await expect(writeAtomic(filePath, 'new\n')).rejects.toThrow(/EISDIR/);

      expect(fs.readdirSync(tree.dir)).toStrictEqual(['target']);
      expect(fs.readdirSync(filePath)).toStrictEqual(['keep.txt']);
    });

    it('surfaces the original error when the cleanup itself fails', async () => {
      using tree = createTempTree({ 'target/keep.txt': 'keep\n' });
      const rmSpy = vi.spyOn(fsPromises, 'rm').mockRejectedValueOnce(new Error('cleanup failed'));

      await expect(writeAtomic(tree.resolve('target'), 'new\n')).rejects.toThrow(/EISDIR/);

      expect(rmSpy).toHaveBeenCalledTimes(1);
      expect(fs.readdirSync(tree.dir).filter((name) => name.endsWith('.tmp'))).toHaveLength(1);
    });
  });
});
