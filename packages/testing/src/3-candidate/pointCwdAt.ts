import fs from 'node:fs';
import process from 'node:process';

// Captured before any scope replaces `process.cwd`, which under ESM is before any test body runs.
const nativeCwd = process.cwd.bind(process);

/**
 * Points `process.cwd()` at a directory for the enclosing scope and restores the prior state when the scope
 * exits. The default replaces `process.cwd` alone, leaving the process where it is; `chdir` moves the real
 * process, which a spawned child inherits and a worker thread refuses.
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

  // The move installs the native implementation, so an enclosing replacement does not report over it.
  process.cwd = chdir ? nativeCwd : () => resolvedDir;

  if (chdir) {
    process.chdir(resolvedDir);
  }

  return {
    dir: resolvedDir,

    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      // Restored first, so a `chdir` that fails cannot strand the replacement.
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

/** A directory `process.cwd()` reports for the length of a scope. */
export interface PointedCwd extends Disposable {
  /** Realpath of the directory, which is what both modes report. */
  readonly dir: string;
}

// region | Helpers

/**
 * Resolves `dir` to its realpath, rejecting a path that names no existing directory. A relative path resolves
 * against the directory `process.cwd()` reports, which an enclosing scope may already have pointed elsewhere.
 */
function resolveDirectory(dir: string): string {
  const resolvedDir = fs.realpathSync(dir);

  if (!fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Path "${resolvedDir}" is not a directory`);
  }

  return resolvedDir;
}

// endregion | Helpers
