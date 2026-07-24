import fs from 'node:fs';
import path from 'node:path';

/**
 * Names that identify a project root, in precedence order: when a directory carries more than one,
 * the earliest in this list is the one reported.
 *
 * `.git` matches whether it is a directory (an ordinary clone) or a file (a worktree or submodule).
 *
 * @category Filesystem
 * @stage release
 */
export const DEFAULT_ROOT_MARKERS: ReadonlyArray<string> = [
  '.git',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lock',
];

/**
 * Returns the project root at or above `startDir`, along with the evidence that identified it.
 *
 * Ascends from `startDir` (resolved to an absolute path) and returns the first directory carrying one of
 * `markers`. If no directory up to and including the filesystem root carries one, falls back to the nearest
 * ancestor holding a `package.json`, then to `startDir` itself; both fallbacks report a `null` marker.
 *
 * @example
 * findProjectRoot(import.meta.dirname);  // { marker: '.git', rootDir: '/home/dev/my-app', source: 'marker' }
 *
 * @category Filesystem
 * @stage release
 */
export function findProjectRoot(startDir: string, options: FindProjectRootOptions = {}): ProjectRoot {
  const { markers = DEFAULT_ROOT_MARKERS } = options;

  const resolvedStartDir = path.resolve(startDir);
  let nearestPackageJsonDir: string | undefined;

  // `path.dirname` is its own fixed point at the filesystem root on every platform, so comparing each
  // directory against its predecessor terminates portably while still probing the root itself.
  let dir = resolvedStartDir;
  let previousDir = '';

  while (dir !== previousDir) {
    for (const marker of markers) {
      if (fs.existsSync(path.join(dir, marker))) {
        return { marker, rootDir: dir, source: 'marker' };
      }
    }

    if (nearestPackageJsonDir === undefined && fs.existsSync(path.join(dir, 'package.json'))) {
      nearestPackageJsonDir = dir;
    }

    previousDir = dir;
    dir = path.dirname(dir);
  }

  if (nearestPackageJsonDir !== undefined) {
    return { marker: null, rootDir: nearestPackageJsonDir, source: 'package-json' };
  }

  return { marker: null, rootDir: resolvedStartDir, source: 'start-dir' };
}

export interface FindProjectRootOptions {
  /** Replaces (does not extend) `DEFAULT_ROOT_MARKERS`. */
  markers?: ReadonlyArray<string> | undefined;
}

export interface ProjectRoot {
  /** The marker that identified the root, or `null` when a fallback did. */
  marker: string | null;
  rootDir: string;
  source: ProjectRootSource;
}

export type ProjectRootSource = 'marker' | 'package-json' | 'start-dir';
