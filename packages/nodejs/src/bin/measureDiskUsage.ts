import fs from 'node:fs';
import path from 'node:path';

// The unit in which `stat` reports `blocks`, whatever the filesystem's block size.
const BLOCK_SIZE = 512;

/**
 * Measures the disk space allocated to a directory tree, as `du` does: Symlinks are not followed, and an inode already
 * in `seenInodes` is not counted again, so a file hardlinked into two trees measured with one set counts once. An
 * entry that disappears during the walk is skipped.
 *
 * @internal
 */
export function measureDiskUsage(dir: string, seenInodes: Set<string>): number {
  let total = 0;
  const pending = [dir];

  for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
    const stats = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stats === undefined) continue;

    const inode = `${stats.dev}:${stats.ino}`;
    if (seenInodes.has(inode)) continue;
    seenInodes.add(inode);
    total += stats.blocks * BLOCK_SIZE;

    if (stats.isDirectory()) {
      pending.push(...listChildren(current));
    }
  }

  return total;
}

// region | Helpers

/** Lists a directory's children, or nothing when it disappeared during the walk. */
function listChildren(dir: string): string[] {
  try {
    return fs.readdirSync(dir).map((name) => path.join(dir, name));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

// endregion | Helpers
