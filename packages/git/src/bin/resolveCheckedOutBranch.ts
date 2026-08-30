import { spawnSync } from 'node:child_process';

const FAILURE_PREFIX = 'Could not resolve the checked-out branch with `git branch --show-current`:';
const FAILURE_SUFFIX = 'Pass a branch name explicitly.';

/**
 * Resolves the branch checked out in the current directory. Throws when git is absent, the directory is
 * not a repository, or HEAD names no branch, since each leaves the caller without the name it asked to
 * derive from.
 *
 * @internal
 */
export function resolveCheckedOutBranch(): string {
  const { error, status, stderr, stdout } = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });

  if (error !== undefined) throw failToResolve(error.message);
  if (status !== 0) throw failToResolve(stderr.trim());

  const branch = stdout.trim();
  if (branch === '') throw failToResolve('HEAD names no branch.');

  return branch;
}

// region | Helpers

function failToResolve(cause: string): Error {
  return new Error(`${FAILURE_PREFIX} ${cause} ${FAILURE_SUFFIX}`);
}

// endregion | Helpers
