# @williamthorsen/toolbelt.filesystem

Filesystem utilities for TypeScript and JavaScript.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.filesystem
```

## Runtime requirements

`createTempTree`, `findDirectoryChainMatch`, `listDirectoryChainMatches`, `loadConfigCascade`, `reconcileFile`, `reconcileFileFromFile`, and `writeAtomic` reach the filesystem through `node:` builtins, so they run under Node.js 24 or later, Bun, and Deno. They do not run in browsers, nor in edge runtimes that expose no filesystem. `listDirectoryChain` and `replaceFileExtension` touch no filesystem, so an edge runtime that exposes none runs them; they still import `node:path`, which a browser bundle has to supply.

`loadConfigCascade` imports each config through the host runtime, so a `.ts` config is subject to whatever that runtime does with TypeScript. Node strips types rather than compiling them, which admits erasable syntax alone: an `enum`, a `namespace`, or a parameter property in a config file fails to parse. A `.mjs` or `.js` config sidesteps the question.

## `listDirectoryChain`

```ts
listDirectoryChain(startDir: string, options?: { stopAtDir?: string }): [string, ...string[]];
```

Resolves `startDir` to an absolute path and returns it followed by each of its ancestors, nearest first. It manipulates paths as strings and reads nothing from disk.

```ts
import { listDirectoryChain } from '@williamthorsen/toolbelt.filesystem';

listDirectoryChain('/home/dev/app/src');
// ['/home/dev/app/src', '/home/dev/app', '/home/dev', '/home', '/']

listDirectoryChain('/home/dev/app/src', { stopAtDir: '/home/dev' });
// ['/home/dev/app/src', '/home/dev/app', '/home/dev']
```

`stopAtDir` bounds the ascent inclusively and is resolved the same way `startDir` is, so a relative ceiling behaves like a relative start. One that is neither the start directory nor an ancestor of it throws, naming both, rather than being ignored and letting the ascent run past the bound. The comparison is exact, so a `stopAtDir` differing from its target only in case is off the chain even on a volume that would open it.

The result type records that the chain is never empty, which is what spares the nearest directory an undefined check:

```ts
const [nearestDir] = listDirectoryChain(process.cwd()); // string, not string | undefined
```

The ascent terminates at the filesystem root on every platform, so a Windows drive root or UNC share is as safe a starting point as a POSIX path.

## `listDirectoryChainMatches`

```ts
listDirectoryChainMatches(
  startDir: string,
  names: ReadonlyArray<string>,
  options?: { stopAtDir?: string },
): DirectoryChainMatch[];
```

Returns, for each directory in the chain at or above `startDir`, the first of `names` that exists there:

```ts
interface DirectoryChainMatch {
  dir: string; // the chain level, which differs from the entry's own directory for a nested name
  entryName: string;
  entryPath: string;
}
```

```ts
import { listDirectoryChainMatches } from '@williamthorsen/toolbelt.filesystem';

listDirectoryChainMatches('/home/dev/app/src', ['.git'], { stopAtDir: '/home/dev' });
// [{ dir: '/home/dev/app', entryName: '.git', entryPath: '/home/dev/app/.git' }]
```

A level yields at most one match, the earliest of `names` found there, and a level holding none contributes nothing, so an empty result is an ordinary outcome rather than an error. A name matches a directory as readily as a file, which is what lets `.git` be probed without knowing whether the clone is ordinary or a worktree.

Each name is a path relative to the level it is probed against, so a nested location such as `.config/stack.config.mjs` works. A name that would leave its level (an absolute path, or one whose `..` segments escape it) is rejected before any level is probed, so the rejection never depends on what happens to exist on disk.

`options` is forwarded to `listDirectoryChain`, so `stopAtDir` bounds the ascent the same way.

Every level is probed, because every level's match is reported. Where only the nearest match matters, [`findDirectoryChainMatch`](#finddirectorychainmatch) returns it and stops there.

## `findDirectoryChainMatch`

```ts
findDirectoryChainMatch(
  startDir: string,
  names: ReadonlyArray<string>,
  options?: { stopAtDir?: string },
): DirectoryChainMatch | undefined;
```

Returns the nearest directory at or above `startDir` holding one of `names`, or `undefined` when none does. It is `listDirectoryChainMatches` narrowed to the first hit, sharing its result shape, its options, and its name validation:

```ts
import { findDirectoryChainMatch } from '@williamthorsen/toolbelt.filesystem';

findDirectoryChainMatch('/home/dev/app/src', ['.git']);
// { dir: '/home/dev/app', entryName: '.git', entryPath: '/home/dev/app/.git' }
```

Probing stops at the first level that matches, so no level beyond it is touched -- the reason to reach for this rather than read element zero off `listDirectoryChainMatches`, which probes to the ceiling regardless. The nullable return type is the other reason: a result that may be absent says so, where an array leaves the caller to narrow.

## `loadConfigCascade`

```ts
loadConfigCascade<TConfig>(options: {
  fileNames: ReadonlyArray<string>;
  shouldStopAscent?: (config: TConfig) => boolean;
  startDir: string;
  stopAtDir: string;
}): Promise<ConfigCascade<TConfig>>;
```

Loads every config file between `startDir` and `stopAtDir`, nearest first, and reads nothing above that boundary.

Discovery is [`listDirectoryChainMatches`](#listdirectorychainmatches) bounded at `stopAtDir`: the first of `fileNames` that exists at a level becomes that level's config, a level holding none contributes nothing, and a name that would leave its level is rejected before any file is read. A `stopAtDir` that is neither the start directory nor one of its ancestors throws, on the same terms `listDirectoryChain` sets out.

The boundary is required, and it is the caller's to choose. That is what keeps this function free of any notion of what marks a project: it never asks whether a directory holds a lockfile or a workspace manifest. Where the boundary should be a project root, [`findProjectRoot`](https://github.com/williamthorsen/toolbelt/tree/main/packages/packaging#findprojectroot) in `@williamthorsen/toolbelt.packaging` resolves one from markers.

The matched files are then imported one at a time, and `shouldStopAscent` is consulted after each. Once it returns true, the ascent halts and no farther file is imported at all, rather than being loaded and discarded:

```ts
interface ConfigCascade<TConfig> {
  entries: Array<{
    config: TConfig;
    dir: string; // the cascade level, which differs from the file's own directory for a nested file name
    filePath: string;
  }>;
  stopReason: 'predicate' | 'stop-dir';
}
```

A config is the module's default export. A matched module declaring none is rejected by name; validating what a config contains stays with the caller, which is what lets one mechanism serve schemas sharing no fields.

### The `shouldStopAscent` convention

The predicate is the caller's whole stop policy, so any field can drive it. By convention a config declares a boolean `shouldStopAscent`, which a consumer reads directly:

```ts
import { loadConfigCascade } from '@williamthorsen/toolbelt.filesystem';
import { findProjectRoot } from '@williamthorsen/toolbelt.packaging';

interface StackConfig {
  rules?: Record<string, string>;
  shouldStopAscent?: boolean;
}

const { rootDir } = findProjectRoot(process.cwd());

const { entries, stopReason } = await loadConfigCascade<StackConfig>({
  fileNames: ['stack.config.mjs', 'stack.config.js'],
  shouldStopAscent: (config) => config.shouldStopAscent === true,
  startDir: process.cwd(),
  stopAtDir: rootDir,
});
```

`stopReason` is provenance for the caller to surface, so a user can see whether the predicate ended the cascade or it simply reached the boundary. Which directory bounded it is the `stopAtDir` the caller passed in.

## `reconcileFile`

```ts
reconcileFile(
  filePath: string,
  content: string,
  options?: { conflictPolicy?: 'replace' | 'skip'; isDryRun?: boolean },
): FileReconciliation;
```

Writes `content` to `filePath` and reports what the write took, rather than throwing:

```ts
import { reconcileFile } from '@williamthorsen/toolbelt.filesystem';

reconcileFile('.config/tool.config.ts', template);
// { filePath: '.config/tool.config.ts', outcome: 'created' }
```

Missing parent directories are created. `isDryRun` writes nothing and creates no directory, returning the outcome the real call would have produced, which is what lets a `--dry-run` flag print the same lines the run itself would. A write that would fail is the exception: nothing detects that without attempting it, so a dry run reports the outcome the write was headed for.

`conflictPolicy` decides what becomes of an existing file whose content differs, and decides nothing else: it is consulted in that case alone. The default, `'skip'`, never replaces a file the user may have edited.

| exists | differs | `conflictPolicy` | outcome       |
| ------ | ------- | ---------------- | ------------- |
| no     | —       | —                | `created`     |
| yes    | no      | either           | `up-to-date`  |
| yes    | yes     | `replace`        | `overwritten` |
| yes    | yes     | `skip`           | `skipped`     |

What counts as differing follows the policy, which is the part worth reading twice. `'replace'` promises the file holds exactly `content` afterwards, so only byte-identical content reports `up-to-date`; a file differing from `content` only in trailing whitespace is rewritten, because calling it up to date would leave the caller holding a file that is not what it asked for. `'skip'` modifies nothing either way, so its comparison decides a message alone and ignores trailing whitespace per line and at end of file, which keeps formatter churn from reading as a conflict. `up-to-date` therefore means the same thing under both: this policy has no work to do.

The result discriminates on `outcome`, so a failure always carries its reason:

```ts
type FileReconciliation =
  | { filePath: string; outcome: 'created' | 'overwritten' | 'up-to-date' }
  | { filePath: string; outcome: 'skipped'; error?: string }
  | { filePath: string; outcome: 'failed'; error: string };
```

An I/O error on the write path reports `failed` rather than throwing, which is what lets a command writing several files collect a result for each instead of losing the rest to the first failure.

Three behaviors are worth knowing before they surprise you:

- A `skipped` result carrying an `error` means the existing file could not be read for comparison. The file was left alone, which is exactly what `'skip'` promises, so this is not a failure and a command exiting non-zero on failures should not count it as one.
- The existence probe follows symlinks. A dangling symlink therefore reports as non-existent: the outcome is `created`, the result names the link, and the bytes land at the link's target.
- The probe and the write are separate calls, leaving a window in which another process can create or remove the file. That gap is left open deliberately: the callers this serves are scaffolding commands with no competing writer, and an exclusive-create flag would close only the create half of it.

## `reconcileFileFromFile`

```ts
reconcileFileFromFile(
  filePath: string,
  sourcePath: string,
  options?: { conflictPolicy?: 'replace' | 'skip'; isDryRun?: boolean },
): FileReconciliation;
```

Reconciles `filePath` against the content of `sourcePath`, which is what a command copying a bundled template reaches for:

```ts
import { reconcileFileFromFile } from '@williamthorsen/toolbelt.filesystem';

reconcileFileFromFile('.config/git-cliff.toml', bundledTemplatePath);
// { filePath: '.config/git-cliff.toml', outcome: 'created' }
```

It is [`reconcileFile`](#reconcilefile) with the read supplied: the outcome table, the conflict policy, the created parent directories, and the result type are that function's, unchanged. Three things are this one's own.

The source is read as utf8 text, so a binary source is not supported: it would be decoded and re-encoded on the way through.

A source that cannot be read reports `failed` rather than throwing, and a missing source is not distinguished from an unreadable one. The reason names the source and the cause:

```
Failed to read /pkg/cliff.toml.template: ENOENT: no such file or directory, open '/pkg/cliff.toml.template'
```

The path is interpolated rather than left to the underlying message, which carries none of its own at the read stage: reading a directory yields `EISDIR: illegal operation on a directory, read`. Under `ENOENT` the path therefore reads twice. The result's `filePath` is the destination on this path as on every other, so a caller copying several templates keys its results by destination and still sees which source failed.

The source is read even under `isDryRun`, because the outcome depends on comparing its content. A dry run can therefore report `failed` where `reconcileFile`'s cannot, and it still writes nothing.

## `createTempTree`

Candidate tier: imported from `@williamthorsen/toolbelt.filesystem/candidate` rather than the package root, and subject to change.

```ts
createTempTree(entries: Record<string, string | Uint8Array>, options?: { prefix?: string }): TempTree;
```

Builds a throwaway directory tree and returns a handle that removes it when the binding leaves scope:

```ts
import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';

{
  using tree = createTempTree({
    '.git/': '',
    'packages/app/package.json': '{ "name": "app" }',
  });

  tree.dir; // '/private/var/folders/.../toolbelt-a1b2c3'
  tree.resolve('packages/app'); // '/private/var/folders/.../toolbelt-a1b2c3/packages/app'
}
// The tree is gone here.
```

Each key of `entries` is a path relative to the tree root. One ending in `/` becomes a directory; any other becomes a file holding the mapped contents, with its intermediate directories created for it. A key resolving outside the root is rejected, and a call that throws leaves nothing on disk.

A value is text or the bytes themselves, so a body no UTF-8 round trip survives is as writable as a string:

```ts
using tree = createTempTree({ 'logo.png': pngBytes });
```

`prefix` names the directory built under the system temporary directory, defaulting to `toolbelt-`. Set it to whatever is doing the building, so a tree outliving a crashed run says what made it:

```ts
using tree = createTempTree({}, { prefix: 'rdy-tsconfig-' });
tree.dir; // '/private/var/folders/.../rdy-tsconfig-a1b2c3'
```

A prefix that would place the tree anywhere but directly inside the system temporary directory is rejected before anything is created. `mkdtemp` appends its random suffix to the joined path as given, so a prefix holding `/` or `\` targets a nested directory that has to already exist, or, where it ascends, a directory outside the temporary one; and a prefix that normalizes away (`''`, `'.'`, or `'..'`) lands the suffix beside the temporary directory rather than within it.

```ts
interface TempTree extends Disposable {
  readonly dir: string;
  exists(entryPath: string): boolean;
  list(entryPath?: string): string[];
  listFiles(entryPath?: string): string[];
  mkdir(entryPath: string): string;
  read(entryPath: string): string;
  readJson(entryPath: string): unknown;
  resolve(...segments: string[]): string;
  rm(entryPath: string): void;
  symlink(linkPath: string, targetPath: string): string;
  write(entryPath: string, contents: string | Uint8Array): string;
  writeAll(entries: Record<string, string | Uint8Array>): void;
  writeJson(entryPath: string, value: unknown): string;
}
```

`dir` is realpath-resolved, because `os.tmpdir()` is a symlink on macOS and a caller comparing paths against it would otherwise see a mismatch it did not cause.

`resolve` joins `segments` against the root and throws when the result would fall outside it, so a stray `..` fails loudly rather than reaching into the enclosing directory. An absolute segment landing inside the root is returned unchanged. The containment test is lexical, so it does not follow a symlink inside the tree that points out of it.

`mkdir`, `symlink`, `write`, `writeAll`, and `writeJson` write into the tree after it is built, for a fixture that varies per test or a file created to trigger a re-read:

```ts
using tree = createTempTree({ 'packages/app/package.json': '{ "name": "app" }' });

tree.write('packages/app/src/main.ts', 'export {};\n'); // '/private/var/folders/.../packages/app/src/main.ts'
tree.writeJson('tsconfig.json', { include: ['src'] });
tree.mkdir('packages/empty');
```

Each creates the parent directories that it needs, resolves through the same containment check as `resolve`, and returns the absolute path of what it wrote. `symlink`'s link path is checked; its target is not, being a string held by the link rather than a location the tree writes to.

`writeAll` takes the same map the constructor takes, `/`-suffix convention included, so a fixture built in one call can be added to in one call:

```ts
tree.writeAll({ 'packages/empty/': '', 'packages/app/src/main.ts': 'export {};\n' });
```

It returns nothing, there being no single path to return, and unlike the constructor it is not atomic: a failure part-way leaves the entries already written in place, there being no whole tree to discard.

They part company on an entry that already exists: `write` replaces it, `mkdir` leaves it and its contents alone, and `symlink` raises `EEXIST`.

`symlink` takes the link first and the target second, inverting `fs.symlinkSync`, so that it reads like the other methods: the path being created leads. The target is stored verbatim, so it may be absolute or relative, name something outside the tree, or dangle until the target appears; a relative one resolves against the link's own directory, as POSIX resolves it. Code under test that reads a link rather than following it therefore sees the string that was passed, which is what a consumer hashing a link's target depends on.

```ts
using tree = createTempTree({ 'store/kit/package.json': '{ "name": "kit" }' });

tree.symlink('node_modules/kit', '../store/kit'); // reads back as '../store/kit'
tree.symlink('node_modules/.bin', tree.resolve('store/kit/bin')); // reads back absolute
```

The link type is chosen from the target, which is where the one portability difference lives. An absolute directory target is linked as a junction, which Windows creates without the elevation needed by a directory symlink; a relative directory target is linked as a directory, which needs that elevation, because Node normalizes a junction's target to an absolute path and would discard the relative string. Every other target, one that does not exist included, is linked as a file, matching what Node falls back to when no type is given.

`exists`, `list`, `listFiles`, `read`, `readJson`, and `rm` read the tree back and remove from it, each through the same containment check:

```ts
using tree = createTempTree({ 'packages/app/package.json': '{ "name": "app" }', 'packages/app/src/main.ts': 'export {};\n' });

tree.list(); // ['packages'], defaulting to the tree root
tree.list('packages/app'); // ['package.json', 'src'], sorted
tree.listFiles('packages'); // ['app/package.json', 'app/src/main.ts'], at any depth
tree.read('packages/app/src/main.ts'); // 'export {};\n'
tree.readJson('packages/app/package.json'); // unknown, for the caller to narrow
tree.exists('packages/app/tsconfig.json'); // false
tree.rm('packages/app');
```

`listFiles` reaches every depth and reports paths relative to the directory it was given, sorted, with `/` as the separator on every platform: a path a test asserts on is a value rather than a location, so `'app/src/main.ts'` should not vary by platform. It parts from `list` twice. A directory that is not there answers `[]` where `list` raises `ENOENT`, which is what lets a suite assert that a build emitted nothing without guarding the call; a path that exists as a file still raises `ENOTDIR`, as `list` does. And a symlink below the directory it was given is neither named nor descended, so every path in the result names a file held inside the tree, where `list` reports a link by name at its own level. The directory given as the argument is the exception, followed as `list`, `read`, and `exists` follow theirs: one naming a link out of the tree lists the target's files.

`read` returns UTF-8 text, and a missing entry raises `ENOENT` rather than answering emptily -- `exists` is the check. `readJson` returns `unknown`, so a caller narrows it rather than trusting an asserted type; contents that do not parse raise an error naming the entry, which the parse error alone does not. `exists` follows a symlink, so a dangling one answers `false`. `rm` is recursive and silent on an entry that is not there.

`writeJson` writes two-space-indented JSON ending in a newline, so a tree outliving a crashed run reads as a real config file would. A fixture needing exact bytes goes through `write` instead. A value `JSON.stringify` cannot represent -- `undefined`, a function, a symbol -- is refused rather than written, so an optional binding that arrived empty fails at the call that passed it instead of surfacing later as a parse error.

Disposal is idempotent, and it removes a tree that has been made unwritable: unlinking an entry needs write permission on the directory containing it, so disposal restores permission across the tree and retries once before giving up. A suite that chmods a directory to exercise a write-failure path therefore needs no wrapper to chmod it back.

`Disposable` is declared in `lib.esnext.disposable.d.ts` alone, so consuming this export requires `ESNext.Disposable` in your `lib`.

## `replaceFileExtension`

Proposed tier: imported from `@williamthorsen/toolbelt.filesystem/proposed` rather than the package root, and subject to change.

```ts
replaceFileExtension(filePath: string, newExtension: string, options?: { oldExtension?: string }): string;
```

Returns `filePath` with its extension replaced. It manipulates the string alone and touches no filesystem.

```ts
import { replaceFileExtension } from '@williamthorsen/toolbelt.filesystem/proposed';

replaceFileExtension('src/main.ts', '.js'); // 'src/main.js'
replaceFileExtension('src/main.ts', 'js'); // 'src/main.js' -- the leading period is optional
replaceFileExtension('src/main.ts', ''); // 'src/main' -- an empty replacement removes the extension
```

The extension being replaced defaults to whatever `path.extname` reports, which is the substring from the final period in the file name. That is wrong for a multi-part extension: `path.extname('src/main.d.ts')` returns `.ts`, so the default would yield `src/main.d.js`. Declare the whole extension through `oldExtension` to replace it entire:

```ts
replaceFileExtension('src/main.d.ts', '.js', { oldExtension: '.d.ts' }); // 'src/main.js'
```

Which extension is meant is genuinely ambiguous, since `archive.tar.gz` could reasonably end in `.gz` or in `.tar.gz`, so the caller declares it rather than the function guessing.

Two inputs throw rather than returning a path that would quietly be wrong: a `filePath` ending in a separator, which names a directory rather than a file, and a `filePath` that does not end with a declared `oldExtension`.

## `writeAtomic`

Proposed tier: imported from `@williamthorsen/toolbelt.filesystem/proposed` rather than the package root, and subject to change.

```ts
writeAtomic(filePath: string, content: string | Uint8Array): Promise<void>;
```

Writes `content` to `filePath` through a temp file and a rename, so a concurrent reader sees either the previous file or the complete new one, never a partial write:

```ts
import { writeAtomic } from '@williamthorsen/toolbelt.filesystem/proposed';

await writeAtomic('.agents/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
```

The temp file is a sibling of the target, which is the part a hand-rolled copy most often gets wrong: `rename` is atomic only within one filesystem, so a temp file staged under the system temporary directory fails with `EXDEV` the moment the target lives on another volume. Its name is dot-prefixed and carries a random component, so it stays out of `*` globs and two processes writing the same target do not collide.

Missing parent directories are created, as they are for [`reconcileFile`](#reconcilefile).

An existing target's permission bits are carried onto the replacement. A plain `writeFile` truncates the file in place and so preserves its mode, while a rename replaces the inode and would otherwise reset it to the platform default; without this, swapping a plain write for an atomic one would silently widen a `0o600` file to world-readable. A target that does not exist yet gets the platform default, exactly as a plain write would.

Three behaviors are worth knowing before they surprise you:

- Nothing is fsynced. "Atomic" here means no torn reads, not survives-power-loss: a write this function has returned from can still be lost to a power failure. A durability option is additive if a caller ever needs one.
- A symlink at `filePath` is replaced by a regular file rather than written through, because the rename replaces the target's directory entry. The link's former target is left untouched.
- A failure removes the temp file best-effort and rethrows the error that caused it, never the cleanup's own. Where the cleanup also fails, the temp file survives beside the target under its dot-prefixed name ending in `.tmp`, which is where to look for one.
