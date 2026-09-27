import { execFileSync } from 'node:child_process';

import { createTempDir, type TempDir } from './createTempDir.ts';

/**
 * Creates a throwaway git working tree containing the given entries, every one of them tracked.
 *
 * Adoption checks read the files that git tracks, so an untracked fixture file is invisible to them. Staging a
 * file is enough to track it, which keeps the fixture free of the identity that a commit requires.
 */
export function createTrackedRepo(entries: Record<string, string>): TempDir {
  const tree = createTempDir(entries);

  try {
    runGit(tree.dir, 'init', '--quiet');
    runGit(tree.dir, 'add', '--all');
    return tree;
  } catch (error) {
    tree[Symbol.dispose]();
    throw error;
  }
}

// region | Helpers

/** Runs a git command against a directory, discarding its output. */
function runGit(dir: string, ...args: string[]): void {
  execFileSync('git', ['-C', dir, ...args], { stdio: 'ignore' });
}

// endregion | Helpers
