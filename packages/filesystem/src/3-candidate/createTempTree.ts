import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Creates a throwaway directory tree and returns a handle that removes it on disposal. Each key of `entries` is a
 * path relative to the tree root: one ending in `/` becomes a directory, and any other becomes a file holding the
 * mapped contents. A key resolving outside the root is rejected, and a call that throws leaves nothing on disk.
 *
 * `prefix` names the directory, so a tree outliving a crashed run still says what made it.
 *
 * @example
 * using tree = createTempTree({ '.git/': '', 'src/main.ts': 'export {};\n' });
 * tree.resolve('src/main.ts'); // '/private/var/folders/…/toolbelt-a1b2c3/src/main.ts'
 *
 * @category Filesystem
 * @experimental
 * @stage candidate
 */
export function createTempTree(entries: Record<string, string>, options: CreateTempTreeOptions = {}): TempTree {
  const { prefix = 'toolbelt-' } = options;

  assertNamesNoDirectory(prefix);

  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));

  try {
    for (const [entry, contents] of Object.entries(entries)) {
      const entryPath = resolveWithinTree(dir, [entry]);

      if (entry.endsWith('/')) {
        fs.mkdirSync(entryPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(entryPath), { recursive: true });
        fs.writeFileSync(entryPath, contents);
      }
    }
  } catch (error) {
    fs.rmSync(dir, { force: true, recursive: true });
    throw error;
  }

  return {
    dir,

    resolve(...segments: string[]): string {
      return resolveWithinTree(dir, segments);
    },

    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's `Symbol` list omits `dispose`, standard since ES2026.
    [Symbol.dispose](): void {
      fs.rmSync(dir, { force: true, recursive: true });
    },
  };
}

export interface CreateTempTreeOptions {
  /** Name the directory is built under, within the system temporary directory. Defaults to `toolbelt-`. */
  prefix?: string;
}

export interface TempTree extends Disposable {
  /** Realpath of the tree root, resolved because `os.tmpdir()` is a symlink on macOS. */
  readonly dir: string;

  /**
   * Resolves `segments` against the tree root, throwing when the result falls outside it. An absolute segment
   * landing inside the root is returned. The containment test is lexical, so it does not follow a symlink within
   * the tree that points out of it.
   */
  resolve(...segments: string[]): string;
}

// region | Helpers
/**
 * Rejects a prefix holding a path separator. `mkdtemp` appends its random suffix to the string as given, so such a
 * prefix builds the tree inside a directory of its own, or above the system temporary directory entirely.
 */
function assertNamesNoDirectory(prefix: string): void {
  // Both separators are tested, because Windows resolves each and `path.sep` names only one of them.
  if (prefix.includes('/') || prefix.includes('\\')) {
    throw new Error(`Temporary-directory prefix "${prefix}" contains a path separator`);
  }
}

/** Resolves `segments` against `dir`, rejecting a result that falls outside it. */
function resolveWithinTree(dir: string, segments: ReadonlyArray<string>): string {
  const target = path.resolve(dir, ...segments);

  if (target !== dir && !target.startsWith(dir + path.sep)) {
    throw new Error(`Path "${target}" falls outside the temporary tree at "${dir}"`);
  }

  return target;
}
// endregion | Helpers
