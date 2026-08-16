import path from 'node:path';
import process from 'node:process';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { pointCwdAt } from '../pointCwdAt.ts';

// Bound before any scope replaces `process.cwd`, so a test can read where the process actually is.
const nativeCwd = process.cwd.bind(process);

describe(pointCwdAt, () => {
  describe('replacing `process.cwd`', () => {
    it('reports the directory', () => {
      using tree = createTempTree({ 'src/': '' });

      using cwd = pointCwdAt(tree.dir);

      expect(process.cwd()).toBe(tree.dir);
      expect(cwd.dir).toBe(tree.dir);
    });

    it('leaves the process where it was', () => {
      using tree = createTempTree({ 'src/': '' });
      const startDir = readRealDir();

      using _cwd = pointCwdAt(tree.dir);

      expect(readRealDir()).toBe(startDir);
    });

    it('restores the reported directory on disposal', () => {
      using tree = createTempTree({ 'src/': '' });
      const startDir = process.cwd();

      {
        using _cwd = pointCwdAt(tree.dir);
      }

      expect(process.cwd()).toBe(startDir);
    });
  });

  describe('moving the process', () => {
    it('moves the process and reports the directory', () => {
      using tree = createTempTree({ 'src/': '' });

      using cwd = pointCwdAt(tree.dir, { chdir: true });

      expect(readRealDir()).toBe(tree.dir);
      expect(process.cwd()).toBe(tree.dir);
      expect(cwd.dir).toBe(tree.dir);
    });

    it('restores the original directory on disposal', () => {
      using tree = createTempTree({ 'src/': '' });
      const startDir = readRealDir();

      {
        using _cwd = pointCwdAt(tree.dir, { chdir: true });
      }

      expect(readRealDir()).toBe(startDir);
      expect(process.cwd()).toBe(startDir);
    });

    it('leaves an enclosing scope reporting its own directory when the move fails', () => {
      using tree = createTempTree({ 'inner/': '' });
      // A worker thread's `process.chdir` throws this way, and so does a directory removed after validation.
      const chdirSpy = vi.spyOn(process, 'chdir').mockImplementation(() => {
        throw new Error('chdir is unavailable');
      });
      onTestFinished(() => chdirSpy.mockRestore());

      using _outer = pointCwdAt(tree.dir);

      expect(() => pointCwdAt(tree.resolve('inner'), { chdir: true })).toThrow('chdir is unavailable');
      expect(process.cwd()).toBe(tree.dir);
    });
  });

  describe('restoration on a throw', () => {
    it('restores the reported directory', () => {
      using tree = createTempTree({ 'src/': '' });
      const startDir = process.cwd();

      expect(() => {
        using _cwd = pointCwdAt(tree.dir);
        throw new Error('thrown within the scope');
      }).toThrow('thrown within the scope');

      expect(process.cwd()).toBe(startDir);
    });

    it('restores the moved process', () => {
      using tree = createTempTree({ 'src/': '' });
      const startDir = readRealDir();

      expect(() => {
        using _cwd = pointCwdAt(tree.dir, { chdir: true });
        throw new Error('thrown within the scope');
      }).toThrow('thrown within the scope');

      expect(readRealDir()).toBe(startDir);
    });
  });

  describe('nested scopes', () => {
    it('restores what the enclosing scope reported', () => {
      using tree = createTempTree({ 'inner/': '' });

      using _outer = pointCwdAt(tree.dir);
      {
        using _inner = pointCwdAt(tree.resolve('inner'));

        expect(process.cwd()).toBe(tree.resolve('inner'));
      }

      expect(process.cwd()).toBe(tree.dir);
    });

    it('reports its own directory when a move is nested inside a replacement', () => {
      using tree = createTempTree({ 'inner/': '' });
      const startDir = readRealDir();

      using _outer = pointCwdAt(tree.dir);
      {
        using _inner = pointCwdAt(tree.resolve('inner'), { chdir: true });

        expect(process.cwd()).toBe(tree.resolve('inner'));
        expect(readRealDir()).toBe(tree.resolve('inner'));
      }

      expect(process.cwd()).toBe(tree.dir);
      expect(readRealDir()).toBe(startDir);
    });
  });

  describe('directory resolution', () => {
    it('resolves a relative path against the reported directory', () => {
      using tree = createTempTree({ 'src/': '' });
      const relativeDir = path.relative(readRealDir(), tree.dir);

      using cwd = pointCwdAt(relativeDir);

      expect(cwd.dir).toBe(tree.dir);
      expect(process.cwd()).toBe(tree.dir);
    });

    it('resolves a relative path against the directory an enclosing scope reports', () => {
      using tree = createTempTree({ 'inner/': '' });

      using _outer = pointCwdAt(tree.dir);
      using inner = pointCwdAt('inner');

      expect(inner.dir).toBe(tree.resolve('inner'));
    });

    it('resolves a symlink to its target, in either mode', () => {
      using tree = createTempTree({ 'target/': '' });
      tree.symlink('link', 'target');

      using replaced = pointCwdAt(tree.resolve('link'));
      using moved = pointCwdAt(tree.resolve('link'), { chdir: true });

      expect(replaced.dir).toBe(tree.resolve('target'));
      expect(moved.dir).toBe(tree.resolve('target'));
    });
  });

  describe('rejected paths', () => {
    it('rejects a path that does not exist, in either mode', () => {
      using tree = createTempTree({ 'src/': '' });
      const missingDir = tree.resolve('absent');

      expect(() => pointCwdAt(missingDir)).toThrow('ENOENT');
      expect(() => pointCwdAt(missingDir, { chdir: true })).toThrow('ENOENT');
    });

    it('rejects a file, in either mode', () => {
      using tree = createTempTree({ 'settings.json': '{}' });
      const filePath = tree.resolve('settings.json');

      expect(() => pointCwdAt(filePath)).toThrow('is not a directory');
      expect(() => pointCwdAt(filePath, { chdir: true })).toThrow('is not a directory');
    });

    it('leaves the process untouched when it rejects a path', () => {
      using tree = createTempTree({ 'settings.json': '{}' });
      const startDir = readRealDir();

      expect(() => pointCwdAt(tree.resolve('settings.json'), { chdir: true })).toThrow('is not a directory');

      expect(process.cwd()).toBe(startDir);
      expect(readRealDir()).toBe(startDir);
    });
  });
});

// region | Helpers

/** Reads the directory the process is actually in, which a replaced `process.cwd` does not report. */
function readRealDir(): string {
  return nativeCwd();
}

// endregion | Helpers
