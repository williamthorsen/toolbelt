import fs from 'node:fs';
import path from 'node:path';

/**
 * Finds the first executable file named `name` in a list of directories, searched in order, and returns its path
 * as `<dir>/<name>`. An empty entry and a directory that cannot be resolved are skipped, as is a directory whose
 * real path is that of `excludeDir`, so a differently spelled entry for an excluded directory is still excluded.
 * A symlink is followed, so a dangling one is not a match. Returns `undefined` when no directory provides one.
 *
 * @category Executables
 * @experimental
 * @stage candidate
 */
export function findExecutableOnPath(
  name: string,
  dirs: readonly string[],
  options: FindExecutableOnPathOptions = {},
): string | undefined {
  const excludedRealPath = options.excludeDir === undefined ? undefined : resolveRealPath(options.excludeDir);

  for (const dir of dirs) {
    if (dir === '') continue;

    const realPath = resolveRealPath(dir);
    if (realPath === undefined || realPath === excludedRealPath) continue;

    const candidate = path.join(dir, name);
    if (isExecutableFile(candidate)) return candidate;
  }

  return undefined;
}

export interface FindExecutableOnPathOptions {
  /** A directory whose executables are passed over, compared by real path. */
  readonly excludeDir?: string | undefined;
}

// region | Helpers

/** Reports whether a path names a file, following a symlink, that the process may execute. */
function isExecutableFile(filePath: string): boolean {
  try {
    if (!fs.statSync(filePath).isFile()) return false;
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Resolves a path's real path, or `undefined` where the path does not exist. */
function resolveRealPath(dirPath: string): string | undefined {
  try {
    return fs.realpathSync(dirPath);
  } catch {
    return undefined;
  }
}

// endregion | Helpers
