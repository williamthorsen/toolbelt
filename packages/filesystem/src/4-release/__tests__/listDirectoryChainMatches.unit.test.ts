import { describe, expect, it } from 'vitest';

import { createTempTree } from '../../1-proposed/createTempTree.ts';
import { listDirectoryChainMatches } from '../directory-chain-matches.ts';

describe(listDirectoryChainMatches, () => {
  it('returns the levels holding a match, nearest first, skipping those holding none', () => {
    using tree = createTempTree({
      'app/src/': '',
      'app/stack.config.mjs': '',
      'stack.config.mjs': '',
    });

    const result = listDirectoryChainMatches(tree.resolve('app/src'), ['stack.config.mjs'], {
      stopAtDir: tree.dir,
    });

    expect(result.map((match) => match.dir)).toStrictEqual([tree.resolve('app'), tree.dir]);
  });

  it('reports the level, the name that matched, and the full path', () => {
    using tree = createTempTree({ 'stack.config.mjs': '' });

    const result = listDirectoryChainMatches(tree.dir, ['stack.config.mjs'], { stopAtDir: tree.dir });

    expect(result).toStrictEqual([
      { dir: tree.dir, entryName: 'stack.config.mjs', entryPath: tree.resolve('stack.config.mjs') },
    ]);
  });

  it('takes the earliest matching name at each level independently', () => {
    using tree = createTempTree({
      'app/primary.config.mjs': '',
      'app/secondary.config.mjs': '',
      'secondary.config.mjs': '',
    });

    const result = listDirectoryChainMatches(tree.resolve('app'), ['primary.config.mjs', 'secondary.config.mjs'], {
      stopAtDir: tree.dir,
    });

    expect(result.map((match) => match.entryName)).toStrictEqual(['primary.config.mjs', 'secondary.config.mjs']);
  });

  it('matches a directory as readily as a file', () => {
    using tree = createTempTree({ '.git/': '', 'app/': '' });

    const result = listDirectoryChainMatches(tree.resolve('app'), ['.git'], { stopAtDir: tree.dir });

    expect(result).toStrictEqual([{ dir: tree.dir, entryName: '.git', entryPath: tree.resolve('.git') }]);
  });

  it('given a nested name, reports the chain level rather than the entry’s own directory', () => {
    using tree = createTempTree({ '.config/stack.config.mjs': '' });

    const result = listDirectoryChainMatches(tree.dir, ['.config/stack.config.mjs'], { stopAtDir: tree.dir });

    expect(result).toStrictEqual([
      {
        dir: tree.dir,
        entryName: '.config/stack.config.mjs',
        entryPath: tree.resolve('.config/stack.config.mjs'),
      },
    ]);
  });

  it('given no stop directory, ascends past the start directory', () => {
    using tree = createTempTree({ 'app/src/': '', 'app/toolbelt-chain-marker.txt': '' });

    const result = listDirectoryChainMatches(tree.resolve('app/src'), ['toolbelt-chain-marker.txt']);

    expect(result.map((match) => match.dir)).toStrictEqual([tree.resolve('app')]);
  });

  it('if no level holds a name, returns no matches', () => {
    using tree = createTempTree({ 'app/': '' });

    const result = listDirectoryChainMatches(tree.resolve('app'), ['stack.config.mjs'], { stopAtDir: tree.dir });

    expect(result).toStrictEqual([]);
  });

  it('rejects an absolute name', () => {
    using tree = createTempTree({ 'stack.config.mjs': '' });

    const listMatches = () =>
      listDirectoryChainMatches(tree.dir, [tree.resolve('stack.config.mjs')], { stopAtDir: tree.dir });

    expect(listMatches).toThrow(/must be relative to its directory level/);
  });

  it('rejects a name that would ascend above its level, even when an earlier name matches', () => {
    using tree = createTempTree({ 'app/stack.config.mjs': '' });

    const listMatches = () =>
      listDirectoryChainMatches(tree.resolve('app'), ['stack.config.mjs', '../shared.config.mjs'], {
        stopAtDir: tree.dir,
      });

    expect(listMatches).toThrow(/must not ascend above its directory level/);
  });

  it('given `..` segments that resolve back within the level, matches the entry', () => {
    using tree = createTempTree({ 'stack.config.mjs': '' });

    const result = listDirectoryChainMatches(tree.dir, ['nested/../stack.config.mjs'], { stopAtDir: tree.dir });

    expect(result.map((match) => match.dir)).toStrictEqual([tree.dir]);
  });

  it('rejects a stop directory that is not on the chain', () => {
    using tree = createTempTree({ 'app/': '' });

    const listMatches = () =>
      listDirectoryChainMatches(tree.resolve('app'), ['stack.config.mjs'], {
        stopAtDir: tree.resolve('x'),
      });

    expect(listMatches).toThrow(/start directory or one of its ancestors/);
  });
});
