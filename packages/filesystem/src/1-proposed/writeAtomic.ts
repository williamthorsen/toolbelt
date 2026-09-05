import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Writes `content` to `filePath` through a sibling temp file and a rename, so a concurrent reader sees either the
 * previous file or the complete new one, never a partial write. Siting the temp file beside the target is what
 * keeps the rename within one filesystem, where it is atomic.
 *
 * Missing parent directories are created. An existing target's permission bits are carried onto the replacement,
 * which a bare `writeFile` would preserve by truncating in place and a rename would otherwise reset to the
 * platform default.
 *
 * Two guarantees that it does not make. Nothing is fsynced, so a power loss can lose a write from which this
 * function has already returned; "atomic" here means no torn reads. And the rename replaces the target's directory
 * entry, so a symlink at `filePath` becomes a regular file rather than being written through.
 *
 * A failure removes the temp file best-effort and rethrows the error that caused it. Where the cleanup itself
 * fails, the temp file survives beside the target under a dot-prefixed name ending in `.tmp`.
 *
 * @example
 * await writeAtomic('.agents/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
 *
 * @category Filesystem
 * @experimental
 * @stage proposed
 */
export async function writeAtomic(filePath: string, content: string | Uint8Array): Promise<void> {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  const mode = await findFileMode(filePath);
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${randomBytes(8).toString('hex')}.tmp`);

  try {
    // The creation mode is umask-filtered, so `chmod` is what restores the exact bits; creating at the filtered
    // mode first keeps the interim from ever being wider than the target.
    await fs.writeFile(tempPath, content, { mode });
    if (mode !== undefined) await fs.chmod(tempPath, mode);

    await fs.rename(tempPath, filePath);
  } catch (error: unknown) {
    try {
      await fs.rm(tempPath, { force: true });
    } catch {
      // The write or rename failure is what the caller needs, so a failed cleanup must not replace it.
    }

    throw error;
  }
}

// region | Helpers
/**
 * Returns the permission bits of the file at `filePath`, or `undefined` where they cannot be read, the ordinary
 * case being a target that does not exist yet.
 */
async function findFileMode(filePath: string): Promise<number | undefined> {
  try {
    const stats = await fs.stat(filePath);

    // The mask drops the file-type bits, which `writeFile` has no use for and some runtimes reject.
    return stats.mode & 0o777;
  } catch {
    return undefined;
  }
}
// endregion | Helpers
