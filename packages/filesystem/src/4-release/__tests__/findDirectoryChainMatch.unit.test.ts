import fs from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTempTree } from '../../1-proposed/createTempTree.ts';
import { findDirectoryChainMatch } from '../directory-chain-matches.ts';

describe(findDirectoryChainMatch, () => {
  const existsSyncSpy = vi.spyOn(fs, 'existsSync');

  afterEach(() => {
    existsSyncSpy.mockClear();
  });

  it('returns the nearest level holding one of the names', () => {
    using tree = createTempTree({ 'app/src/': '', 'app/stack.config.mjs': '', 'stack.config.mjs': '' });

    const result = findDirectoryChainMatch(tree.resolve('app/src'), ['stack.config.mjs'], {
      stopAtDir: tree.dir,
    });

    expect(result).toStrictEqual({
      dir: tree.resolve('app'),
      entryName: 'stack.config.mjs',
      entryPath: tree.resolve('app/stack.config.mjs'),
    });
  });

  it('probes no level beyond the first that matches', () => {
    using tree = createTempTree({ 'app/src/': '', 'app/stack.config.mjs': '', 'stack.config.mjs': '' });

    findDirectoryChainMatch(tree.resolve('app/src'), ['stack.config.mjs']);

    expect(existsSyncSpy.mock.calls.map(([target]) => target)).toStrictEqual([
      tree.resolve('app/src/stack.config.mjs'),
      tree.resolve('app/stack.config.mjs'),
    ]);
  });

  it('if no level holds a name, returns undefined', () => {
    using tree = createTempTree({ 'app/': '' });

    const result = findDirectoryChainMatch(tree.resolve('app'), ['stack.config.mjs'], { stopAtDir: tree.dir });

    expect(result).toBeUndefined();
  });

  it('takes the earliest matching name within a level', () => {
    using tree = createTempTree({ 'primary.config.mjs': '', 'secondary.config.mjs': '' });

    const result = findDirectoryChainMatch(tree.dir, ['primary.config.mjs', 'secondary.config.mjs'], {
      stopAtDir: tree.dir,
    });

    expect(result?.entryName).toBe('primary.config.mjs');
  });

  it('matches a directory as readily as a file', () => {
    using tree = createTempTree({ '.git/': '', 'app/': '' });

    const result = findDirectoryChainMatch(tree.resolve('app'), ['.git'], { stopAtDir: tree.dir });

    expect(result?.dir).toBe(tree.dir);
  });

  it('rejects a name that would ascend above its level, even when an earlier name matches', () => {
    using tree = createTempTree({ 'app/stack.config.mjs': '' });

    const findMatch = () =>
      findDirectoryChainMatch(tree.resolve('app'), ['stack.config.mjs', '../shared.config.mjs'], {
        stopAtDir: tree.dir,
      });

    expect(findMatch).toThrow(/must not ascend above its directory level/);
  });
});
