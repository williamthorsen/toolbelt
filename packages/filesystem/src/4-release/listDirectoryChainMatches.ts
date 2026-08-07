import fs from 'node:fs';
import path from 'node:path';

import { listDirectoryChain, type ListDirectoryChainOptions } from './listDirectoryChain.ts';

/**
 * Returns, for each directory in the chain above `startDir`, the first of `names` that exists there.
 *
 * Ordering is nearest first, and a level yields at most one match: the earliest of `names` found there. A level
 * holding none contributes nothing, so an empty result is an ordinary outcome rather than an error. A name matches
 * a directory as readily as a file.
 *
 * Each name is a path relative to the level it is probed against, so a nested location such as
 * `.config/stack.config.mjs` works. A name that would leave its level is rejected before any level is probed.
 *
 * @example
 * listDirectoryChainMatches('/home/dev/app/src', ['.git'], { stopAtDir: '/home/dev' });
 * // [{ dir: '/home/dev/app', entryName: '.git', entryPath: '/home/dev/app/.git' }]
 *
 * @category Filesystem
 * @stage release
 * @throws If a name is absolute or escapes its level, or if `stopAtDir` is not on the chain.
 */
export function listDirectoryChainMatches(
  startDir: string,
  names: ReadonlyArray<string>,
  options: ListDirectoryChainMatchesOptions = {},
): DirectoryChainMatch[] {
  assertLevelRelativeNames(names);

  const matches: DirectoryChainMatch[] = [];

  for (const dir of listDirectoryChain(startDir, options)) {
    for (const entryName of names) {
      const entryPath = path.join(dir, entryName);

      if (fs.existsSync(entryPath)) {
        matches.push({ dir, entryName, entryPath });
        break;
      }
    }
  }

  return matches;
}

export interface DirectoryChainMatch {
  /** The chain level the match was found at, which differs from the entry's own directory for a nested name. */
  dir: string;
  entryName: string;
  entryPath: string;
}

/** Forwarded to `listDirectoryChain`. */
export type ListDirectoryChainMatchesOptions = ListDirectoryChainOptions;

// region | Helpers
/**
 * Rejects any name that would resolve outside the level it is probed against, which is what keeps a bounded ascent
 * bounded for a caller-supplied name rather than merely intended. Validated once against the names themselves, so
 * the rejection does not depend on what happens to exist on disk.
 */
function assertLevelRelativeNames(names: ReadonlyArray<string>): void {
  for (const name of names) {
    if (path.isAbsolute(name)) {
      throw new Error(`Entry name must be relative to its directory level: ${name}`);
    }

    // Normalizing first collapses interior `..` segments, so only a name that truly escapes is left leading with one.
    const normalized = path.normalize(name);

    if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
      throw new Error(`Entry name must not ascend above its directory level: ${name}`);
    }
  }
}
// endregion | Helpers
