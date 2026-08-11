# @williamthorsen/toolbelt.filesystem

Filesystem utilities for TypeScript and JavaScript.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.filesystem
```

## Runtime requirements

`createTempTree`, `findDirectoryChainMatch`, `listDirectoryChainMatches`, `loadConfigCascade`, and `reconcileFile` reach the filesystem through `node:` builtins, so they run under Node.js 24 or later, Bun, and Deno. They do not run in browsers, nor in edge runtimes that expose no filesystem. `listDirectoryChain` and `replaceFileExtension` touch no filesystem, so an edge runtime that exposes none runs them; they still import `node:path`, which a browser bundle has to supply.

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

Probing stops at the first level that matches, so no level beyond it is touched — the reason to reach for this rather than read element zero off `listDirectoryChainMatches`, which probes to the ceiling regardless. The nullable return type is the other reason: a result that may be absent says so, where an array leaves the caller to narrow.

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

## `createTempTree`

Proposed tier: imported from `@williamthorsen/toolbelt.filesystem/proposed` rather than the package root, and subject to change.

```ts
createTempTree(entries: Record<string, string>): TempTree;
```

Builds a throwaway directory tree and returns a handle that removes it when the binding leaves scope:

```ts
import { createTempTree } from '@williamthorsen/toolbelt.filesystem/proposed';

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

```ts
interface TempTree extends Disposable {
  readonly dir: string;
  resolve(...segments: string[]): string;
}
```

`dir` is realpath-resolved, because `os.tmpdir()` is a symlink on macOS and a caller comparing paths against it would otherwise see a mismatch it did not cause.

`resolve` joins `segments` against the root and throws when the result would fall outside it, so a stray `..` fails loudly rather than reaching into the enclosing directory. An absolute segment landing inside the root is returned unchanged. The containment test is lexical, so it does not follow a symlink inside the tree that points out of it.

Disposal is idempotent.

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
