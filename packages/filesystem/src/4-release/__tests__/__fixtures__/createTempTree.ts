import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempTrees: string[] = [];

/**
 * Creates a throwaway directory tree and returns its real path. Each key is a path relative to the tree
 * root: one ending in `/` becomes a directory, and any other becomes a file holding the mapped contents.
 *
 * The path is realpath-resolved because `os.tmpdir()` is a symlink on macOS, whereas the functions under
 * test resolve without following symlinks.
 *
 * Every tree is registered for removal by `removeTempTrees`, which a caller runs from `afterEach`.
 */
export function createTempTree(files: Record<string, string>): string {
  const treeDirPrefix = path.join(os.tmpdir(), 'toolbelt-filesystem-');
  const treeDir = fs.realpathSync(fs.mkdtempSync(treeDirPrefix));
  tempTrees.push(treeDir);

  for (const [entry, contents] of Object.entries(files)) {
    const entryPath = path.join(treeDir, entry);

    if (entry.endsWith('/')) {
      fs.mkdirSync(entryPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(entryPath), { recursive: true });
      fs.writeFileSync(entryPath, contents);
    }
  }

  return treeDir;
}

/** Removes every tree created so far. Vitest isolates modules per test file, so the registry is file-scoped. */
export function removeTempTrees(): void {
  for (const treeDir of tempTrees) {
    fs.rmSync(treeDir, { force: true, recursive: true });
  }
  tempTrees.length = 0;
}
