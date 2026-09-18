import fs from 'node:fs';
import path from 'node:path';

const FILE_NAME = '.tool-versions';

/**
 * Finds the `.tool-versions` entry that selects a plugin's version, in asdf's order: the nearest file at or above
 * `startDir` with a line naming the plugin, then the one in `homeDir`, which is read once even when the ascent
 * passes through it. A line is `<plugin> <version>…` after a `#` comment is dropped; the first version is taken and
 * any fallback after it ignored. Returns `undefined` where no file in reach names the plugin. Neither an
 * `ASDF_<PLUGIN>_VERSION` variable nor a legacy version file is consulted.
 *
 * @category asdf
 * @experimental
 * @stage candidate
 */
export function findToolVersionsEntry(
  plugin: string,
  options: FindToolVersionsEntryOptions,
): ToolVersionsEntry | undefined {
  const homeDir = path.resolve(options.homeDir);
  const ancestors = listAncestors(path.resolve(options.startDir));
  let visitedHome = false;

  for (const dir of ancestors) {
    if (dir === homeDir) visitedHome = true;

    const entry = readEntry(path.join(dir, FILE_NAME), plugin);
    if (entry !== undefined) return entry;
  }

  return visitedHome ? undefined : readEntry(path.join(homeDir, FILE_NAME), plugin);
}

export interface FindToolVersionsEntryOptions {
  /** The home directory, whose `.tool-versions` is asdf's last resort. */
  readonly homeDir: string;
  /** The directory from which the ascent starts. */
  readonly startDir: string;
}

/** A `.tool-versions` line that selects a plugin's version, and the file holding it. */
export interface ToolVersionsEntry {
  readonly filePath: string;
  readonly version: string;
}

// region | Helpers

/** Lists a directory and its ancestors up to the root, nearest first. */
function listAncestors(startDir: string): string[] {
  const ancestors = [startDir];

  for (let dir = startDir; ;) {
    const parent = path.dirname(dir);
    if (parent === dir) return ancestors;

    ancestors.push(parent);
    dir = parent;
  }
}

/** Reads the plugin's entry out of one file, or `undefined` where the file is absent or names no version for it. */
function readEntry(filePath: string, plugin: string): ToolVersionsEntry | undefined {
  let contents: string;
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }

  for (const line of contents.split('\n')) {
    const [name, version] = line.replace(/#.*$/, '').trim().split(/\s+/, 2);
    if (name === plugin && version !== undefined && version !== '') return { filePath, version };
  }

  return undefined;
}

// endregion | Helpers
