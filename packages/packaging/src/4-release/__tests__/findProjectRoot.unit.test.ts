import fs from 'node:fs';
import path from 'node:path';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ROOT_MARKERS, findProjectRoot } from '../findProjectRoot.ts';

describe(findProjectRoot, () => {
  const existsSyncSpy = vi.spyOn(fs, 'existsSync');

  afterEach(() => {
    existsSyncSpy.mockClear();
  });

  it('returns the start directory when it carries a marker', () => {
    using tree = createTempTree({ '.git/': '' });

    const result = findProjectRoot(tree.dir);

    expect(result).toStrictEqual({ marker: '.git', rootDir: tree.dir, source: 'marker' });
  });

  it('returns the nearest ancestor carrying a marker', () => {
    using tree = createTempTree({ 'packages/app/src/': '', 'pnpm-workspace.yaml': '' });

    const result = findProjectRoot(tree.resolve('packages/app/src'));

    expect(result).toStrictEqual({ marker: 'pnpm-workspace.yaml', rootDir: tree.dir, source: 'marker' });
  });

  it('matches `.git` when it is a file rather than a directory', () => {
    using tree = createTempTree({ '.git': '', 'src/': '' });

    const result = findProjectRoot(tree.resolve('src'));

    expect(result).toStrictEqual({ marker: '.git', rootDir: tree.dir, source: 'marker' });
  });

  it('reports the earliest matching marker when a directory carries several', () => {
    using tree = createTempTree({ 'yarn.lock': '', 'pnpm-workspace.yaml': '' });

    const result = findProjectRoot(tree.dir);

    expect(result.marker).toBe('pnpm-workspace.yaml');
  });

  it('resolves a relative start directory against the working directory', () => {
    using tree = createTempTree({ '.git/': '', 'src/': '' });
    using _cwd = pointCwdAt(tree.dir);

    const result = findProjectRoot('src');

    expect(result.rootDir).toBe(tree.dir);
  });

  it('given a marker list, ignores the default markers', () => {
    using tree = createTempTree({ 'app/.git/': '', 'deno.json': '' });

    const result = findProjectRoot(tree.resolve('app'), { markers: ['deno.json'] });

    expect(result).toStrictEqual({ marker: 'deno.json', rootDir: tree.dir, source: 'marker' });
  });

  it('if no marker is found, falls back to the nearest directory holding a package.json', () => {
    using tree = createTempTree({ 'app/package.json': '', 'app/src/': '', 'package.json': '' });

    const result = findProjectRoot(tree.resolve('app/src'));

    expect(result).toStrictEqual({ marker: null, rootDir: tree.resolve('app'), source: 'package-json' });
  });

  it('if no marker or package.json is found, falls back to the start directory', () => {
    using tree = createTempTree({ 'app/src/': '' });

    const result = findProjectRoot(tree.resolve('app/src'));

    expect(result).toStrictEqual({ marker: null, rootDir: tree.resolve('app/src'), source: 'start-dir' });
  });

  it('probes no directory above the marker it finds', () => {
    using tree = createTempTree({ '.git/': '', 'app/src/': '' });

    findProjectRoot(tree.resolve('app/src'));

    const probedDirs = [...new Set(existsSyncSpy.mock.calls.map(([target]) => path.dirname(String(target))))];

    expect(probedDirs).toStrictEqual([tree.resolve('app/src'), tree.resolve('app'), tree.dir]);
  });

  it('rejects an absolute marker', () => {
    using tree = createTempTree({ '.git/': '' });

    const find = () => findProjectRoot(tree.dir, { markers: [tree.resolve('.git')] });

    expect(find).toThrow(/must be relative to its directory level/);
  });

  it('rejects a marker that would ascend above its level', () => {
    using tree = createTempTree({ '.git/': '', 'app/': '' });

    const find = () => findProjectRoot(tree.resolve('app'), { markers: ['../.git'] });

    expect(find).toThrow(/must not ascend above its directory level/);
  });
});

describe('DEFAULT_ROOT_MARKERS', () => {
  it('lists the root markers in precedence order', () => {
    expect(DEFAULT_ROOT_MARKERS).toStrictEqual([
      '.git',
      'pnpm-workspace.yaml',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      'bun.lock',
    ]);
  });
});
