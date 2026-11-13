import path from 'node:path';

/**
 * Returns `startDir` resolved to an absolute path, followed by each of its ancestors, nearest first.
 *
 * The chain runs to the filesystem root unless `stopAtDir` bounds it. The ascent ends at the root on every platform,
 * so a Windows drive root or a UNC share is as safe a start as a POSIX path. The chain always contains at least the
 * start directory, which the return type records, so a caller reads the nearest directory without an `undefined`
 * check. Paths are manipulated as strings, and the function does not read anything from disk.
 *
 * @example
 * listDirectoryChain('/home/dev/app/src', { stopAtDir: '/home/dev' });
 * // ['/home/dev/app/src', '/home/dev/app', '/home/dev']
 *
 * @category Filesystem
 * @stage release
 * @throws If `stopAtDir` is neither the start directory nor one of its ancestors, naming both paths.
 */
export function listDirectoryChain(startDir: string, options: ListDirectoryChainOptions = {}): [string, ...string[]] {
  const { stopAtDir } = options;

  const resolvedStartDir = path.resolve(startDir);
  // Resolve the ceiling as well, so that a relative `stopAtDir` behaves like a relative `startDir`. Comparison
  // stays exact after resolution: Case-folding would be right on a case-insensitive volume and wrong on every
  // other.
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

  // Checking for the escape after the ascent finishes is more reliable than testing
  // `startsWith(stopAtDir + path.sep)` up front, which misjudges a ceiling at the filesystem root, where that
  // concatenation doubles the separator.
  if (resolvedStopAtDir !== undefined && !hasReachedStopAtDir) {
    throw new Error(
      'Stop directory must be the start directory or one of its ancestors: ' +
        `stopAtDir=${resolvedStopAtDir}, startDir=${resolvedStartDir}`,
    );
  }

  return chain;
}

export interface ListDirectoryChainOptions {
  /**
   * Bounds the ascent, inclusive. Must be the start directory or one of its ancestors. It is resolved as `startDir`
   * is, so a relative ceiling works like a relative start. The comparison is exact: A `stopAtDir` that differs from
   * a chain directory only in case is off the chain, even on a case-insensitive volume.
   */
  stopAtDir?: string | undefined;
}
