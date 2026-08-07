import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { findDirectoryChainMatch } from '../directory-chain-matches.ts';
import { createTempTree, removeTempTrees } from './__fixtures__/createTempTree.ts';

describe(findDirectoryChainMatch, () => {
  const existsSyncSpy = vi.spyOn(fs, 'existsSync');

  afterEach(() => {
    existsSyncSpy.mockClear();
    removeTempTrees();
  });

  it('returns the nearest level holding one of the names', () => {
    const treeDir = createTempTree({ 'app/src/': '', 'app/stack.config.mjs': '', 'stack.config.mjs': '' });

    const result = findDirectoryChainMatch(path.join(treeDir, 'app/src'), ['stack.config.mjs'], {
      stopAtDir: treeDir,
    });

    expect(result).toStrictEqual({
      dir: path.join(treeDir, 'app'),
      entryName: 'stack.config.mjs',
      entryPath: path.join(treeDir, 'app/stack.config.mjs'),
    });
  });

  it('probes no level beyond the first that matches', () => {
    const treeDir = createTempTree({ 'app/src/': '', 'app/stack.config.mjs': '', 'stack.config.mjs': '' });

    findDirectoryChainMatch(path.join(treeDir, 'app/src'), ['stack.config.mjs']);

    expect(existsSyncSpy.mock.calls.map(([target]) => target)).toStrictEqual([
      path.join(treeDir, 'app/src/stack.config.mjs'),
      path.join(treeDir, 'app/stack.config.mjs'),
    ]);
  });

  it('if no level holds a name, returns undefined', () => {
    const treeDir = createTempTree({ 'app/': '' });

    const result = findDirectoryChainMatch(path.join(treeDir, 'app'), ['stack.config.mjs'], { stopAtDir: treeDir });

    expect(result).toBeUndefined();
  });

  it('takes the earliest matching name within a level', () => {
    const treeDir = createTempTree({ 'primary.config.mjs': '', 'secondary.config.mjs': '' });

    const result = findDirectoryChainMatch(treeDir, ['primary.config.mjs', 'secondary.config.mjs'], {
      stopAtDir: treeDir,
    });

    expect(result?.entryName).toBe('primary.config.mjs');
  });

  it('matches a directory as readily as a file', () => {
    const treeDir = createTempTree({ '.git/': '', 'app/': '' });

    const result = findDirectoryChainMatch(path.join(treeDir, 'app'), ['.git'], { stopAtDir: treeDir });

    expect(result?.dir).toBe(treeDir);
  });

  it('rejects a name that would ascend above its level, even when an earlier name matches', () => {
    const treeDir = createTempTree({ 'app/stack.config.mjs': '' });

    const findMatch = () =>
      findDirectoryChainMatch(path.join(treeDir, 'app'), ['stack.config.mjs', '../shared.config.mjs'], {
        stopAtDir: treeDir,
      });

    expect(findMatch).toThrow(/must not ascend above its directory level/);
  });
});
