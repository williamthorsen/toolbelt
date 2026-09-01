import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Creates a throwaway directory tree and returns a handle that removes it on disposal. Each key of `entries` is a
 * path relative to the tree root: one ending in `/` becomes a directory, and any other becomes a file holding the
 * mapped contents, given as text or as the bytes themselves. A key resolving outside the root is rejected, and a
 * call that throws leaves nothing on disk.
 *
 * The handle writes into the tree after it is built, through `mkdir`, `symlink`, `write`, `writeAll`, and
 * `writeJson`. Each creates the parent directories that it needs and takes its entry path through the containment check
 * `resolve` applies; `symlink`'s target is the exception, stored verbatim. Every one but `writeAll`, which takes a
 * map, returns the absolute path it wrote. It reads the tree back through `exists`, `list`, `listFiles`, `read`,
 * and `readJson`, and removes an entry through `rm`.
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
export function createTempTree(
  entries: Record<string, string | Uint8Array>,
  options: CreateTempTreeOptions = {},
): TempTree {
  const { prefix = 'toolbelt-' } = options;

  assertNamesDirectChild(prefix);

  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));

  try {
    writeAll(entries);
  } catch (error) {
    fs.rmSync(dir, { force: true, recursive: true });
    throw error;
  }

  function exists(entryPath: string): boolean {
    return fs.existsSync(resolveWithinTree(dir, [entryPath]));
  }

  function list(entryPath = ''): string[] {
    return fs.readdirSync(resolveWithinTree(dir, [entryPath])).toSorted();
  }

  function listFiles(entryPath = ''): string[] {
    const rootPath = resolveWithinTree(dir, [entryPath]);

    if (!fs.existsSync(rootPath)) return [];

    return listFilesBelow(rootPath, '').toSorted();
  }

  function mkdir(entryPath: string): string {
    const absolutePath = resolveWithinTree(dir, [entryPath]);

    fs.mkdirSync(absolutePath, { recursive: true });

    return absolutePath;
  }

  function read(entryPath: string): string {
    return fs.readFileSync(resolveWithinTree(dir, [entryPath]), 'utf8');
  }

  function readJson(entryPath: string): unknown {
    const contents = read(entryPath);

    try {
      return JSON.parse(contents);
    } catch (error) {
      throw new Error(`Entry "${entryPath}" is not readable as JSON`, { cause: error });
    }
  }

  function resolve(...segments: string[]): string {
    return resolveWithinTree(dir, segments);
  }

  function rm(entryPath: string): void {
    fs.rmSync(resolveWithinTree(dir, [entryPath]), { force: true, recursive: true });
  }

  function symlink(linkPath: string, targetPath: string): string {
    const absoluteLink = resolveWithinTree(dir, [linkPath]);

    fs.mkdirSync(path.dirname(absoluteLink), { recursive: true });
    fs.symlinkSync(targetPath, absoluteLink, chooseLinkType(absoluteLink, targetPath));

    return absoluteLink;
  }

  function write(entryPath: string, contents: string | Uint8Array): string {
    const absolutePath = resolveWithinTree(dir, [entryPath]);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);

    return absolutePath;
  }

  function writeAll(newEntries: Record<string, string | Uint8Array>): void {
    for (const [entry, contents] of Object.entries(newEntries)) {
      if (entry.endsWith('/')) {
        mkdir(entry);
      } else {
        write(entry, contents);
      }
    }
  }

  function writeJson(entryPath: string, value: unknown): string {
    const json = JSON.stringify(value, null, 2);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `stringify` is typed as returning `string`, but yields `undefined` for a value with no representation.
    if (json === undefined) {
      throw new Error(`Value of type "${typeof value}" for "${entryPath}" has no JSON representation`);
    }

    return write(entryPath, `${json}\n`);
  }

  return {
    dir,
    exists,
    list,
    listFiles,
    mkdir,
    read,
    readJson,
    resolve,
    rm,
    symlink,
    write,
    writeAll,
    writeJson,

    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's `Symbol` list omits `dispose`, standard since ES2026.
    [Symbol.dispose](): void {
      try {
        fs.rmSync(dir, { force: true, recursive: true });
      } catch {
        restoreDirectoryPermissions(dir);
        fs.rmSync(dir, { force: true, recursive: true });
      }
    },
  };
}

export interface CreateTempTreeOptions {
  /** Leading text of the generated directory's name, to which a random suffix is appended. Defaults to `toolbelt-`. */
  prefix?: string;
}

export interface TempTree extends Disposable {
  /** Realpath of the tree root, resolved because `os.tmpdir()` is a symlink on macOS. */
  readonly dir: string;

  /** Answers whether a tree-relative path exists, following a symlink, so a dangling one answers `false`. */
  exists(entryPath: string): boolean;

  /** Lists the names directly inside a tree-relative directory, sorted, defaulting to the tree root. */
  list(entryPath?: string): string[];

  /**
   * Lists every file below a tree-relative directory, at any depth, as `/`-separated paths relative to it, sorted,
   * defaulting to the tree root. A symlink below that directory is neither listed nor descended, so every path in
   * the result names a file held inside the tree. The directory given as the argument is the exception, followed as
   * `list`, `read`, and `exists` follow theirs: one naming a link out of the tree lists the target's files. A path
   * that does not exist yields an empty array, where `list` throws; one that exists as a file raises `ENOTDIR`, as
   * `list` does.
   */
  listFiles(entryPath?: string): string[];

  /** Creates the directory at a tree-relative path, along with its parents, leaving an existing one as it is. */
  mkdir(entryPath: string): string;

  /** Reads the file at a tree-relative path as UTF-8 text. */
  read(entryPath: string): string;

  /**
   * Reads the file at a tree-relative path as JSON. The result is `unknown`, for the caller to narrow; contents
   * that do not parse raise an error naming the entry, which the parse error alone does not.
   */
  readJson(entryPath: string): unknown;

  /**
   * Resolves `segments` against the tree root, throwing when the result falls outside it. An absolute segment
   * landing inside the root is returned. The containment test is lexical, so it does not follow a symlink within
   * the tree that points out of it.
   */
  resolve(...segments: string[]): string;

  /** Removes a tree-relative entry, along with its contents where it is a directory, and a missing one silently. */
  rm(entryPath: string): void;

  /**
   * Links a tree-relative path to `targetPath`, taking the link first and so inverting `fs.symlinkSync`. The target
   * is stored verbatim and is not containment-checked, being a string held by the link rather than a location to
   * which the tree writes: it may be absolute or relative, name something outside the tree, or dangle. A relative one
   * resolves against the link's own directory, as POSIX resolves it. An occupied link path raises `EEXIST`.
   *
   * The link type is the one portability difference. An absolute directory target is linked as a junction, which
   * Windows creates without the elevation needed by a directory symlink; a relative directory target is linked as a
   * directory, which needs that elevation; every other target, a missing one included, is linked as a file.
   */
  symlink(linkPath: string, targetPath: string): string;

  /** Writes `contents` at a tree-relative path, replacing an existing file. */
  write(entryPath: string, contents: string | Uint8Array): string;

  /**
   * Writes a map of entries in the shape the constructor takes, so a fixture built in one call there can be added
   * to in one call here. Unlike the constructor, a failure part-way leaves the entries already written in place,
   * there being no whole tree to discard.
   */
  writeAll(entries: Record<string, string | Uint8Array>): void;

  /**
   * Writes `value` at a tree-relative path as two-space-indented JSON ending in a newline. A value with no JSON
   * representation -- `undefined`, a function, a symbol -- is refused rather than written.
   */
  writeJson(entryPath: string, value: unknown): string;
}

// region | Helpers
/**
 * Rejects a prefix that would place the tree anywhere but directly inside the system temporary directory. `mkdtemp`
 * appends its random suffix to the joined path as given, so a prefix holding a separator targets a nested directory
 * that has to already exist, or, where it ascends, a directory outside the temporary one; and a prefix that
 * normalizes away lands the suffix beside the temporary directory rather than within it. Every other prefix joins
 * to a name inside it.
 */
function assertNamesDirectChild(prefix: string): void {
  // Both separators are tested, because Windows resolves each and `path.sep` names only one of them.
  if (prefix.includes('/') || prefix.includes('\\')) {
    throw new Error(`Temporary-directory prefix "${prefix}" contains a path separator`);
  }

  if (['', '.', '..'].includes(prefix)) {
    throw new Error(`Temporary-directory prefix "${prefix}" names no new directory`);
  }
}

/**
 * Answers with the link type to give a target, resolving a relative one against the link's own directory as POSIX
 * does. A directory target takes `junction` when absolute and `dir` when relative: Node normalizes a junction's
 * target to an absolute path, which would discard the relative string the link stores. Every other target, one that
 * does not exist included, takes `file`, which is what Node falls back to when no type is given.
 */
function chooseLinkType(absoluteLinkPath: string, targetPath: string): 'dir' | 'file' | 'junction' {
  const resolvedTarget = path.resolve(path.dirname(absoluteLinkPath), targetPath);

  if (fs.statSync(resolvedTarget, { throwIfNoEntry: false })?.isDirectory() !== true) {
    return 'file';
  }

  return path.isAbsolute(targetPath) ? 'junction' : 'dir';
}

/**
 * Lists every file below `dir` as a `/`-separated path relative to it, in directory order, each under `prefix`, the
 * caller's accumulated relative path. `Dirent` predicates read the entry itself, so a symlink is neither listed nor
 * descended.
 *
 * `readdirSync`'s `recursive` option cannot serve here: it descends a symlinked directory, so a link pointing out of
 * the tree lists foreign files, and a link to an ancestor revisits the same entries until `ELOOP` stops it. Joining
 * segments with `/` leaves no platform separator to normalize away, a normalization that would corrupt a POSIX name
 * holding a backslash.
 */
function listFilesBelow(dir: string, prefix: string): string[] {
  const paths: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = `${prefix}${entry.name}`;

    if (entry.isFile()) {
      paths.push(relativePath);
    } else if (entry.isDirectory()) {
      paths.push(...listFilesBelow(path.join(dir, entry.name), `${relativePath}/`));
    }
  }

  return paths;
}

/**
 * Grants `dir` and every directory beneath it write and execute permission, so a tree a test made unwritable can
 * still be removed. Only directories are touched, because unlinking an entry needs permission on its container
 * rather than on the entry. Each directory is chmodded before it is read, so one denying its own listing is
 * readable by the time it is listed.
 */
function restoreDirectoryPermissions(dir: string): void {
  fs.chmodSync(dir, 0o700);

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // `Dirent.isDirectory` reads the entry itself, so a symlink to a directory outside the tree is not followed.
  for (const entry of entries) {
    if (entry.isDirectory()) {
      restoreDirectoryPermissions(path.join(dir, entry.name));
    }
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
