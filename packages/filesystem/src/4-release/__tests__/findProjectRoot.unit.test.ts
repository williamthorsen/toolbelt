import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ROOT_MARKERS, findProjectRoot } from '../findProjectRoot.ts';
import { createTempTree, removeTempTrees } from './__fixtures__/createTempTree.ts';

describe(findProjectRoot, () => {
  const existsSyncSpy = vi.spyOn(fs, 'existsSync');

  afterEach(() => {
    existsSyncSpy.mockClear();
    removeTempTrees();
  });

  it('returns the start directory when it carries a marker', () => {
    const treeDir = createTempTree({ '.git/': '' });

    const result = findProjectRoot(treeDir);

    expect(result).toStrictEqual({ marker: '.git', rootDir: treeDir, source: 'marker' });
  });

  it('returns the nearest ancestor carrying a marker', () => {
    const treeDir = createTempTree({ 'packages/app/src/': '', 'pnpm-workspace.yaml': '' });

    const result = findProjectRoot(path.join(treeDir, 'packages/app/src'));

    expect(result).toStrictEqual({ marker: 'pnpm-workspace.yaml', rootDir: treeDir, source: 'marker' });
  });

  it('matches `.git` when it is a file rather than a directory', () => {
    const treeDir = createTempTree({ '.git': '', 'src/': '' });

    const result = findProjectRoot(path.join(treeDir, 'src'));

    expect(result).toStrictEqual({ marker: '.git', rootDir: treeDir, source: 'marker' });
  });

  it('reports the earliest matching marker when a directory carries several', () => {
    const treeDir = createTempTree({ 'yarn.lock': '', 'pnpm-workspace.yaml': '' });

    const result = findProjectRoot(treeDir);

    expect(result.marker).toBe('pnpm-workspace.yaml');
  });

  it('resolves a relative start directory against the working directory', () => {
    const treeDir = createTempTree({ '.git/': '', 'src/': '' });
    const relativeStartDir = path.relative(process.cwd(), path.join(treeDir, 'src'));

    const result = findProjectRoot(relativeStartDir);

    expect(result.rootDir).toBe(treeDir);
  });

  it('given a marker list, ignores the default markers', () => {
    const treeDir = createTempTree({ 'app/.git/': '', 'deno.json': '' });

    const result = findProjectRoot(path.join(treeDir, 'app'), { markers: ['deno.json'] });

    expect(result).toStrictEqual({ marker: 'deno.json', rootDir: treeDir, source: 'marker' });
  });

  it('if no marker is found, falls back to the nearest directory holding a package.json', () => {
    const treeDir = createTempTree({ 'app/package.json': '', 'app/src/': '', 'package.json': '' });

    const result = findProjectRoot(path.join(treeDir, 'app/src'));

    expect(result).toStrictEqual({ marker: null, rootDir: path.join(treeDir, 'app'), source: 'package-json' });
  });

  it('if no marker or package.json is found, falls back to the start directory', () => {
    const treeDir = createTempTree({ 'app/src/': '' });

    const result = findProjectRoot(path.join(treeDir, 'app/src'));

    expect(result).toStrictEqual({ marker: null, rootDir: path.join(treeDir, 'app/src'), source: 'start-dir' });
  });

  it('probes no directory above the marker it finds', () => {
    const treeDir = createTempTree({ '.git/': '', 'app/src/': '' });

    findProjectRoot(path.join(treeDir, 'app/src'));

    const probedDirs = [...new Set(existsSyncSpy.mock.calls.map(([target]) => path.dirname(String(target))))];

    expect(probedDirs).toStrictEqual([path.join(treeDir, 'app/src'), path.join(treeDir, 'app'), treeDir]);
  });

  it('rejects an absolute marker', () => {
    const treeDir = createTempTree({ '.git/': '' });

    const find = () => findProjectRoot(treeDir, { markers: [path.join(treeDir, '.git')] });

    expect(find).toThrow(/must be relative to its directory level/);
  });

  it('rejects a marker that would ascend above its level', () => {
    const treeDir = createTempTree({ '.git/': '', 'app/': '' });

    const find = () => findProjectRoot(path.join(treeDir, 'app'), { markers: ['../.git'] });

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
