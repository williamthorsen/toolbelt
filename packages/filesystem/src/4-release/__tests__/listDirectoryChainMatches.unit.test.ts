import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { listDirectoryChainMatches } from '../directory-chain-matches.ts';
import { createTempTree, removeTempTrees } from './__fixtures__/createTempTree.ts';

describe(listDirectoryChainMatches, () => {
  afterEach(removeTempTrees);

  it('returns the levels holding a match, nearest first, skipping those holding none', () => {
    const treeDir = createTempTree({
      'app/src/': '',
      'app/stack.config.mjs': '',
      'stack.config.mjs': '',
    });

    const result = listDirectoryChainMatches(path.join(treeDir, 'app/src'), ['stack.config.mjs'], {
      stopAtDir: treeDir,
    });

    expect(result.map((match) => match.dir)).toStrictEqual([path.join(treeDir, 'app'), treeDir]);
  });

  it('reports the level, the name that matched, and the full path', () => {
    const treeDir = createTempTree({ 'stack.config.mjs': '' });

    const result = listDirectoryChainMatches(treeDir, ['stack.config.mjs'], { stopAtDir: treeDir });

    expect(result).toStrictEqual([
      { dir: treeDir, entryName: 'stack.config.mjs', entryPath: path.join(treeDir, 'stack.config.mjs') },
    ]);
  });

  it('takes the earliest matching name at each level independently', () => {
    const treeDir = createTempTree({
      'app/primary.config.mjs': '',
      'app/secondary.config.mjs': '',
      'secondary.config.mjs': '',
    });

    const result = listDirectoryChainMatches(
      path.join(treeDir, 'app'),
      ['primary.config.mjs', 'secondary.config.mjs'],
      { stopAtDir: treeDir },
    );

    expect(result.map((match) => match.entryName)).toStrictEqual(['primary.config.mjs', 'secondary.config.mjs']);
  });

  it('matches a directory as readily as a file', () => {
    const treeDir = createTempTree({ '.git/': '', 'app/': '' });

    const result = listDirectoryChainMatches(path.join(treeDir, 'app'), ['.git'], { stopAtDir: treeDir });

    expect(result).toStrictEqual([{ dir: treeDir, entryName: '.git', entryPath: path.join(treeDir, '.git') }]);
  });

  it('given a nested name, reports the chain level rather than the entry’s own directory', () => {
    const treeDir = createTempTree({ '.config/stack.config.mjs': '' });

    const result = listDirectoryChainMatches(treeDir, ['.config/stack.config.mjs'], { stopAtDir: treeDir });

    expect(result).toStrictEqual([
      {
        dir: treeDir,
        entryName: '.config/stack.config.mjs',
        entryPath: path.join(treeDir, '.config/stack.config.mjs'),
      },
    ]);
  });

  it('given no stop directory, ascends past the start directory', () => {
    const treeDir = createTempTree({ 'app/src/': '', 'app/toolbelt-chain-marker.txt': '' });

    const result = listDirectoryChainMatches(path.join(treeDir, 'app/src'), ['toolbelt-chain-marker.txt']);

    expect(result.map((match) => match.dir)).toStrictEqual([path.join(treeDir, 'app')]);
  });

  it('if no level holds a name, returns no matches', () => {
    const treeDir = createTempTree({ 'app/': '' });

    const result = listDirectoryChainMatches(path.join(treeDir, 'app'), ['stack.config.mjs'], { stopAtDir: treeDir });

    expect(result).toStrictEqual([]);
  });

  it('rejects an absolute name', () => {
    const treeDir = createTempTree({ 'stack.config.mjs': '' });

    const listMatches = () =>
      listDirectoryChainMatches(treeDir, [path.join(treeDir, 'stack.config.mjs')], { stopAtDir: treeDir });

    expect(listMatches).toThrow(/must be relative to its directory level/);
  });

  it('rejects a name that would ascend above its level, even when an earlier name matches', () => {
    const treeDir = createTempTree({ 'app/stack.config.mjs': '' });

    const listMatches = () =>
      listDirectoryChainMatches(path.join(treeDir, 'app'), ['stack.config.mjs', '../shared.config.mjs'], {
        stopAtDir: treeDir,
      });

    expect(listMatches).toThrow(/must not ascend above its directory level/);
  });

  it('given `..` segments that resolve back within the level, matches the entry', () => {
    const treeDir = createTempTree({ 'stack.config.mjs': '' });

    const result = listDirectoryChainMatches(treeDir, ['nested/../stack.config.mjs'], { stopAtDir: treeDir });

    expect(result.map((match) => match.dir)).toStrictEqual([treeDir]);
  });

  it('rejects a stop directory that is not on the chain', () => {
    const treeDir = createTempTree({ 'app/': '' });

    const listMatches = () =>
      listDirectoryChainMatches(path.join(treeDir, 'app'), ['stack.config.mjs'], {
        stopAtDir: path.join(treeDir, 'x'),
      });

    expect(listMatches).toThrow(/start directory or one of its ancestors/);
  });
});
