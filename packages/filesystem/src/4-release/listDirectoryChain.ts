import path from 'node:path';

/**
 * Returns `startDir` resolved to an absolute path, followed by each of its ancestors, nearest first.
 *
 * The chain runs to the filesystem root unless `stopAtDir` bounds it, and always holds at least the start
 * directory, which is what the return type records. Paths are manipulated as strings; nothing is read from disk.
 *
 * @example
 * listDirectoryChain('/home/dev/app/src', { stopAtDir: '/home/dev' });
 * // ['/home/dev/app/src', '/home/dev/app', '/home/dev']
 *
 * @category Filesystem
 * @stage release
 * @throws If `stopAtDir` is neither the start directory nor one of its ancestors.
 */
export function listDirectoryChain(startDir: string, options: ListDirectoryChainOptions = {}): [string, ...string[]] {
  const { stopAtDir } = options;

  const resolvedStartDir = path.resolve(startDir);
  // Resolve the ceiling as well, so a relative `stopAtDir` behaves like a relative `startDir`. Comparison stays
  // exact after resolution: case-folding would be right on a case-insensitive volume and wrong on every other.
  const resolvedStopAtDir = stopAtDir === undefined ? undefined : path.resolve(stopAtDir);

  const chain: [string, ...string[]] = [resolvedStartDir];
  let dir = resolvedStartDir;
  let hasReachedStopAtDir = dir === resolvedStopAtDir;

  while (!hasReachedStopAtDir) {
    const parentDir = path.dirname(dir);

    // `path.dirname` is its own fixed point at the filesystem root on every platform, so comparing a directory
    // against its parent terminates the ascent portably.
    if (parentDir === dir) break;

    chain.push(parentDir);
    dir = parentDir;
    hasReachedStopAtDir = dir === resolvedStopAtDir;
  }

  // Reading the escape off the finished ascent beats testing `startsWith(stopAtDir + path.sep)` up front, which
  // misjudges a ceiling at the filesystem root, where that concatenation doubles the separator.
  if (resolvedStopAtDir !== undefined && !hasReachedStopAtDir) {
    throw new Error(
      'Stop directory must be the start directory or one of its ancestors: ' +
        `stopAtDir=${resolvedStopAtDir}, startDir=${resolvedStartDir}`,
    );
  }

  return chain;
}

export interface ListDirectoryChainOptions {
  /** Bounds the ascent, inclusive. Must be the start directory or one of its ancestors. */
  stopAtDir?: string | undefined;
}
