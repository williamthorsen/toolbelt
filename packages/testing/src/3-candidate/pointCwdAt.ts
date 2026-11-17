import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Captured before any scope replaces `process.cwd`, which under ESM is before any test body runs.
const nativeCwd = process.cwd.bind(process);

/**
 * Points `process.cwd()` at a directory for the enclosing scope and restores the prior state when the scope
 * exits. The default replaces `process.cwd` alone, leaving the process where it is; `chdir` moves the real
 * process, which a spawned child inherits and code asking the OS rather than Node observes.
 *
 * On POSIX, a bare relative path handed to `fs` reads from the real directory under the replacement and from the
 * pointed one under `chdir`; on Windows, Node resolves it through `process.cwd()` first, so both modes read from the
 * pointed directory. `process.chdir` throws `ERR_WORKER_UNSUPPORTED_OPERATION` in a worker thread, so `chdir` needs
 * Vitest's `pool: 'forks'`. Neither mode touches `process.env.PWD`.
 *
 * `dir` resolves through `realpathSync` in both modes, and a path naming no existing directory is rejected. A relative
 * path resolves against the directory that `process.cwd()` reports, which an enclosing scope may already have pointed
 * elsewhere. Each scope restores the state that it found, so scopes nest in any combination, and a move nested inside
 * a replacement puts the process back where it really was.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * using tree = createTempTree({ 'src/': '', '.git/': '' });
 * using _cwd = pointCwdAt(tree.dir);
 *
 * expect(findProjectRoot('src').rootDir).toBe(tree.dir);
 */
export function pointCwdAt(dir: string, options: PointCwdAtOptions = {}): PointedCwd {
  const { chdir = false } = options;

  const resolvedDir = resolveDirectory(dir);
  // eslint-disable-next-line @typescript-eslint/unbound-method -- the property is saved to be restored, never called.
  const previousCwd = process.cwd;
  const previousDir = chdir ? nativeCwd() : undefined;

  // Move the process before replacing the property, so that a `chdir` that throws leaves both untouched.
  if (chdir) {
    process.chdir(resolvedDir);
  }

  // Install the native implementation on a move, so that an enclosing replacement does not report over it.
  process.cwd = chdir ? nativeCwd : () => resolvedDir;

  return {
    dir: resolvedDir,

    [Symbol.dispose]() {
      // Restore the property first, so that a `chdir` that fails cannot strand the replacement.
      process.cwd = previousCwd;

      if (previousDir !== undefined) {
        process.chdir(previousDir);
      }
    },
  };
}

/** Options for a cwd-pointing scope. */
export interface PointCwdAtOptions {
  /** Whether to move the real process with `process.chdir`, rather than replace `process.cwd` alone. */
  chdir?: boolean;
}

/** A directory that `process.cwd()` reports for the length of a scope. */
export interface PointedCwd extends Disposable {
  /** Realpath of the directory, which both modes report. */
  readonly dir: string;
}

// region | Helpers

/** Resolves `dir` to its realpath, rejecting a path that names no existing directory. */
function resolveDirectory(dir: string): string {
  const resolvedDir = fs.realpathSync(path.resolve(dir));

  if (!fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Path "${resolvedDir}" is not a directory`);
  }

  return resolvedDir;
}

// endregion | Helpers
