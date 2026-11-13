import fs from 'node:fs';
import path from 'node:path';

import { listDirectoryChain, type ListDirectoryChainOptions } from './listDirectoryChain.ts';

export interface DirectoryChainMatch {
  /** The chain level at which the match was found, which differs from the entry's own directory for a nested name. */
  dir: string;
  entryName: string;
  entryPath: string;
}

/** Forwarded to `listDirectoryChain`. */
export type DirectoryChainMatchOptions = ListDirectoryChainOptions;

/**
 * Returns the nearest directory at or above `startDir` holding one of `names`, or `undefined` when none does.
 *
 * Probing stops at the first level that matches, so no level beyond it is touched, whereas element zero of
 * `listDirectoryChainMatches` costs a probe of every level up to the ceiling. The nullable return type also states
 * that the result may be absent, which an array leaves the caller to narrow. When every level's match matters,
 * `listDirectoryChainMatches` collects them all.
 *
 * Each name is a path relative to the level against which it is probed: A nested location such as
 * `.config/stack.config.mjs` works. A name that would leave its level is rejected before any level is probed.
 *
 * @example
 * findDirectoryChainMatch('/home/dev/app/src', ['.git']);
 * // { dir: '/home/dev/app', entryName: '.git', entryPath: '/home/dev/app/.git' }
 *
 * @category Filesystem
 * @stage release
 * @throws If a name is absolute or escapes its level, or if `stopAtDir` is not on the chain.
 */
export function findDirectoryChainMatch(
  startDir: string,
  names: ReadonlyArray<string>,
  options: DirectoryChainMatchOptions = {},
): DirectoryChainMatch | undefined {
  assertLevelRelativeNames(names);

  return iterateDirectoryChainMatches(startDir, names, options).next().value;
}

/**
 * Returns, for each directory in the chain at or above `startDir`, the first of `names` that exists there.
 *
 * Ordering is nearest first, and a level yields at most one match: the earliest of `names` found there. A level
 * containing none contributes nothing, so an empty result is an ordinary outcome rather than an error. A name
 * matches a directory as readily as a file, so `.git` is found whether the clone is an ordinary one or a worktree.
 *
 * Every level is probed. When only the nearest match matters, `findDirectoryChainMatch` stops at the first.
 *
 * Each name is a path relative to the level against which it is probed, so a nested location such as
 * `.config/stack.config.mjs` works. A name that would leave its level is rejected before any level is probed, so the
 * rejection does not depend on what exists on disk.
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
  options: DirectoryChainMatchOptions = {},
): DirectoryChainMatch[] {
  assertLevelRelativeNames(names);

  return iterateDirectoryChainMatches(startDir, names, options).toArray();
}

// region | Helpers
/**
 * Rejects any name that would resolve outside the level against which it is probed, which keeps a bounded
 * ascent bounded for a caller-supplied name rather than merely intended. Validated once against the names themselves,
 * so the rejection does not depend on what happens to exist on disk.
 */
function assertLevelRelativeNames(names: ReadonlyArray<string>): void {
  for (const name of names) {
    if (path.isAbsolute(name)) {
      throw new Error(`Entry name must be relative to its directory level: ${name}`);
    }

    // Normalize first to collapse interior `..` segments, leaving only a name that truly escapes still leading with
    // one.
    const normalized = path.normalize(name);

    if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
      throw new Error(`Entry name must not ascend above its directory level: ${name}`);
    }
  }
}

/** Returns the first of `names` that exists in `dir`. */
function findMatchingName(dir: string, names: ReadonlyArray<string>): string | undefined {
  for (const name of names) {
    if (fs.existsSync(path.join(dir, name))) {
      return name;
    }
  }

  return undefined;
}

/** Yields a match for each level of the chain, nearest first, that contains one of `names`. */
function* iterateDirectoryChainMatches(
  startDir: string,
  names: ReadonlyArray<string>,
  options: DirectoryChainMatchOptions,
): Generator<DirectoryChainMatch, undefined> {
  for (const dir of listDirectoryChain(startDir, options)) {
    const entryName = findMatchingName(dir, names);

    if (entryName !== undefined) {
      yield { dir, entryName, entryPath: path.join(dir, entryName) };
    }
  }
}
// endregion | Helpers
