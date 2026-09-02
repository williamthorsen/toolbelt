import { execFileSync } from 'node:child_process';

import { createTempDir, type TempDir } from './createTempDir.ts';

/**
 * Creates a throwaway git working tree holding the given entries, every one of them tracked.
 *
 * Adoption checks read the files that git tracks, so an untracked fixture file is invisible to them. Staging is
 * enough to be tracked, which is what keeps the fixture clear of the identity demanded by a commit.
 */
export function createTrackedRepo(entries: Record<string, string>): TempDir {
  const tree = createTempDir(entries);

  try {
    runGit(tree.dir, 'init', '--quiet');
    runGit(tree.dir, 'add', '--all');
    return tree;
  } catch (error) {
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's `Symbol` list omits `dispose`, standard since ES2026.
    tree[Symbol.dispose]();
    throw error;
  }
}

// region | Helpers

function runGit(dir: string, ...args: string[]): void {
  execFileSync('git', ['-C', dir, ...args], { stdio: 'ignore' });
}

// endregion | Helpers
