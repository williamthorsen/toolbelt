import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Writes `content` to `filePath` through a sibling temp file and a rename, so a concurrent reader sees either the
 * previous file or the complete new one, never a partial write. Creating the temp file beside the target keeps the
 * rename within one filesystem, where it is atomic; a temp file staged under the system temporary directory fails
 * with `EXDEV` whenever the target is on another volume. The temp file's name is dot-prefixed, which keeps it out of
 * `*` globs, and contains a random component, which keeps two processes writing the same target from colliding.
 *
 * Missing parent directories are created. An existing target's permission bits are copied onto the replacement,
 * which a bare `writeFile` would preserve by truncating in place and a rename would otherwise reset to the platform
 * default: Without the copy, a `0o600` file would become world-readable. A target that does not exist yet gets the
 * platform default, as it would from a plain write.
 *
 * Two guarantees that it does not make. Nothing is fsynced, so a power loss can lose a write from which this
 * function has already returned; "atomic" here means no torn reads, and a durability option can be added without
 * breaking a caller. And because the rename replaces the target's directory entry, a symlink at `filePath` becomes
 * a regular file rather than being written through; the link's former target is left untouched.
 *
 * A failure removes the temp file best-effort and rethrows the error that caused it, never the cleanup's own. If the
 * cleanup itself fails, the temp file remains beside the target under a dot-prefixed name ending in `.tmp`.
 *
 * @example
 * await writeAtomic('.agents/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
 *
 * @category Filesystem
 * @experimental
 * @stage candidate
 */
export async function writeAtomic(filePath: string, content: string | Uint8Array): Promise<void> {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  const mode = await findFileMode(filePath);
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${randomBytes(8).toString('hex')}.tmp`);

  try {
    // The creation mode is umask-filtered, so `chmod` restores the exact bits; creating at the filtered
    // mode first keeps the interim from ever being wider than the target.
    await fs.writeFile(tempPath, content, { mode });
    if (mode !== undefined) await fs.chmod(tempPath, mode);

    await fs.rename(tempPath, filePath);
  } catch (error: unknown) {
    try {
      await fs.rm(tempPath, { force: true });
    } catch {
      // A failed cleanup must not replace the write or rename failure, which the caller needs.
    }

    throw error;
  }
}

// region | Helpers
/**
 * Returns the permission bits of the file at `filePath`, or `undefined` if they cannot be read, the ordinary
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
