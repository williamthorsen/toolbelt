import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Creates a throwaway directory holding the given entries and returns a handle that removes it on disposal. Each
 * key is a directory-relative path to a text file, whose parent directories are created before the write. A call
 * that throws leaves nothing on disk.
 *
 * Scaffolding for adoption's own tests, held to node builtins because the adoption layer declares no workspace
 * dependency.
 */
export function createTempDir(entries: Record<string, string>): TempDir {
  // Realpathed because `os.tmpdir()` is a symlink on macOS, and a sweep reports the resolved path.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'toolbelt-adoption-')));

  try {
    for (const [entry, contents] of Object.entries(entries)) {
      const entryPath = path.join(dir, entry);

      fs.mkdirSync(path.dirname(entryPath), { recursive: true });
      fs.writeFileSync(entryPath, contents);
    }
  } catch (error) {
    fs.rmSync(dir, { force: true, recursive: true });
    throw error;
  }

  return {
    dir,

    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's `Symbol` list omits `dispose`, standard since ES2026.
    [Symbol.dispose](): void {
      fs.rmSync(dir, { force: true, recursive: true });
    },
  };
}

/** A throwaway directory removed when its scope exits. */
export interface TempDir extends Disposable {
  /** Realpath of the directory root. */
  readonly dir: string;
}
