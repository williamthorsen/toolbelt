<!-- readme-type: library -->

# @williamthorsen/toolbelt.filesystem

Filesystem utilities for TypeScript and JavaScript.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.filesystem
```

## Runtime requirements

`findDirectoryChainMatch`, `listDirectoryChainMatches`, `loadConfigCascade`, `reconcileFile`, `reconcileFileFromFile`, and `writeAtomic` reach the filesystem through `node:` builtins, so they run under Node.js 24 or later, Bun, and Deno. They do not run in browsers, nor in edge runtimes that expose no filesystem. `listDirectoryChain` and `replaceFileExtension` touch no filesystem, so an edge runtime that exposes none runs them; they still import `node:path`, which a browser bundle has to supply.

`loadConfigCascade` imports each config through the host runtime, so a `.ts` config is subject to whatever that runtime does with TypeScript. Node strips types rather than compiling them, which admits erasable syntax alone: An `enum`, a `namespace`, or a parameter property in a config file fails to parse. A `.mjs` or `.js` config sidesteps the question.

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports two idioms, each counted against the calls that the project already makes into this package. Both report at `recommend`: They are correct code that a published function expresses better, not defects.

`no-hand-rolled-atomic-write` reports a function body that writes a path held in a binding and renames that same binding, naming the function that holds it. A write alone, a rename alone, a `copyFile` followed by a rename, and a rename of a path that the body never wrote report nothing. The site reports at `recommend` however the temp file is staged, because a text scan cannot tell whether two paths share a volume, and one staged under the system temporary directory is the case worth checking by hand: `rename` is atomic only within one filesystem.

`no-hand-rolled-directory-walk` reports a loop that ascends by `dirname` until it reaches the filesystem root, naming the line the loop opens on. A loop that only ascends takes [`listDirectoryChain`](#listdirectorychain); one that probes each level for a name takes [`findDirectoryChainMatch`](#finddirectorychainmatch) or [`listDirectoryChainMatches`](#listdirectorychainmatches), and the report distinguishes the two. A loop probing for `package.json` is left alone: That site belongs to [`@williamthorsen/toolbelt.packaging`](https://github.com/williamthorsen/toolbelt/tree/main/packages/packaging#readme), whose `findProjectRoot` covers it, and reporting it here would mean seeing one loop twice under conflicting advice.

The walk detector under-matches by design. A recursive walk-up function is no loop, an ascent written as `path.resolve(dir, '..')` carries a different anchor, and a loop that computes a parent per item without assigning it back is no ascent. None of the three reports.

Bootstrap wrappers under `bin/` are exempt: Such a wrapper imports only builtins so its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they write these shapes deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: The sweep drops it before the kit sees it, so committed bundler output yields no advice that anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.filesystem/no-hand-rolled-directory-walk -- the ascent stops at a ceiling
while (dir !== stopAtDir) {
  dir = path.dirname(dir);
}
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.filesystem'],
});
```

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

The result type records that the chain is never empty, which spares the nearest directory an undefined check:

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

A level yields at most one match, the earliest of `names` found there, and a level holding none contributes nothing, so an empty result is an ordinary outcome rather than an error. A name matches a directory as readily as a file, which lets `.git` be probed without knowing whether the clone is ordinary or a worktree.

Each name is a path relative to the level against which it is probed, so a nested location such as `.config/stack.config.mjs` works. A name that would leave its level (an absolute path, or one whose `..` segments escape it) is rejected before any level is probed, so the rejection never depends on what happens to exist on disk.

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

Probing stops at the first level that matches, so no level beyond it is touched -- the reason to reach for this rather than read element zero off `listDirectoryChainMatches`, which probes to the ceiling regardless. The nullable return type is the other reason: A result that may be absent says so, where an array leaves the caller to narrow.

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

Discovery is [`listDirectoryChainMatches`](#listdirectorychainmatches) bounded at `stopAtDir`: The first of `fileNames` that exists at a level becomes that level's config, a level holding none contributes nothing, and a name that would leave its level is rejected before any file is read. A `stopAtDir` that is neither the start directory nor one of its ancestors throws, on the same terms that `listDirectoryChain` sets out.

The boundary is required, and it is the caller's to choose. That keeps this function free of any notion of what marks a project: It never asks whether a directory holds a lockfile or a workspace manifest. Where the boundary should be a project root, [`findProjectRoot`](https://github.com/williamthorsen/toolbelt/tree/main/packages/packaging#findprojectroot) in `@williamthorsen/toolbelt.packaging` resolves one from markers.

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

A config is the module's default export. A matched module declaring none is rejected by name; validating what a config contains stays with the caller, which lets one mechanism serve schemas sharing no fields.

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

`stopReason` is provenance for the caller to surface, so a user can see whether the predicate ended the cascade or it simply reached the boundary. Which directory bounded it is the `stopAtDir` passed in by the caller.

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

Missing parent directories are created. `isDryRun` writes nothing and creates no directory, returning the outcome that the real call would have produced, which lets a `--dry-run` flag print what the run itself would. A write that would fail is the exception: Nothing detects that without attempting it, so a dry run reports the write's intended outcome.

`conflictPolicy` decides what becomes of an existing file whose content differs, and decides nothing else: It is consulted in that case alone. The default, `'skip'`, never replaces a file that the user may have edited.

| exists | differs | `conflictPolicy` | outcome       |
| ------ | ------- | ---------------- | ------------- |
| no     | n/a     | n/a              | `created`     |
| yes    | no      | either           | `up-to-date`  |
| yes    | yes     | `replace`        | `overwritten` |
| yes    | yes     | `skip`           | `skipped`     |

What counts as differing follows the policy, which is the part worth reading twice. `'replace'` promises the file holds exactly `content` afterwards, so only byte-identical content reports `up-to-date`; a file differing from `content` only in trailing whitespace is rewritten, because calling it up to date would leave the caller holding a file that is not what it asked for. `'skip'` modifies nothing either way, so its comparison decides a message alone and ignores trailing whitespace per line and at end of file, which keeps formatter churn from reading as a conflict. `up-to-date` therefore means the same thing under both: This policy has no work to do.

The result discriminates on `outcome`, so a failure always names its reason:

```ts
type FileReconciliation =
  | { filePath: string; outcome: 'created' | 'overwritten' | 'up-to-date' }
  | { filePath: string; outcome: 'skipped'; error?: string }
  | { filePath: string; outcome: 'failed'; error: string };
```

An I/O error on the write path reports `failed` rather than throwing, which lets a command writing several files collect a result for each instead of losing the rest to the first failure.

Three behaviors are worth knowing before they surprise you:

- A `skipped` result with an `error` means the existing file could not be read for comparison. The file was left alone, which is exactly what `'skip'` promises, so this is not a failure and a command exiting non-zero on failures should not count it as one.
- The existence probe follows symlinks. A dangling symlink therefore reports as non-existent: The outcome is `created`, the result names the link, and the bytes land at the link's target.
- The probe and the write are separate calls, leaving a window in which another process can create or remove the file. That gap is left open deliberately: The callers that this serves are scaffolding commands with no competing writer, and an exclusive-create flag would close only the create half of it.

## `reconcileFileFromFile`

```ts
reconcileFileFromFile(
  filePath: string,
  sourcePath: string,
  options?: { conflictPolicy?: 'replace' | 'skip'; isDryRun?: boolean },
): FileReconciliation;
```

Reconciles `filePath` against the content of `sourcePath`, for which a command copying a bundled template reaches:

```ts
import { reconcileFileFromFile } from '@williamthorsen/toolbelt.filesystem';

reconcileFileFromFile('.config/git-cliff.toml', bundledTemplatePath);
// { filePath: '.config/git-cliff.toml', outcome: 'created' }
```

It is [`reconcileFile`](#reconcilefile) with the read supplied: The outcome table, the conflict policy, the created parent directories, and the result type are that function's, unchanged. Three things are this one's own.

The source is read as utf8 text, so a binary source is not supported: It would be decoded and re-encoded on the way through.

A source that cannot be read reports `failed` rather than throwing, and a missing source is not distinguished from an unreadable one. The reason names the source and the cause:

```
Failed to read /pkg/cliff.toml.template: ENOENT: no such file or directory, open '/pkg/cliff.toml.template'
```

The path is interpolated rather than left to the underlying message, which has none of its own at the read stage: Reading a directory yields `EISDIR: illegal operation on a directory, read`. Under `ENOENT` the path therefore reads twice. The result's `filePath` is the destination on this path as on every other, so a caller copying several templates keys its results by destination and still sees which source failed.

The source is read even under `isDryRun`, because the outcome depends on comparing its content. A dry run can therefore report `failed` where `reconcileFile`'s cannot, and it still writes nothing.

## `replaceFileExtension`

Proposed tier: Imported from `@williamthorsen/toolbelt.filesystem/proposed` rather than the package root, and subject to change.

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

Candidate tier: Imported from `@williamthorsen/toolbelt.filesystem/candidate` rather than the package root, and subject to change.

```ts
writeAtomic(filePath: string, content: string | Uint8Array): Promise<void>;
```

Writes `content` to `filePath` through a temp file and a rename, so a concurrent reader sees either the previous file or the complete new one, never a partial write:

```ts
import { writeAtomic } from '@williamthorsen/toolbelt.filesystem/candidate';

await writeAtomic('.agents/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
```

The temp file is a sibling of the target, which is the part that a hand-rolled copy most often gets wrong: `rename` is atomic only within one filesystem, so a temp file staged under the system temporary directory fails with `EXDEV` the moment the target lives on another volume. Its name is dot-prefixed and contains a random component, so it stays out of `*` globs and two processes writing the same target do not collide.

Missing parent directories are created, as they are for [`reconcileFile`](#reconcilefile).

An existing target's permission bits are copied onto the replacement. A plain `writeFile` truncates the file in place and so preserves its mode, while a rename replaces the inode and would otherwise reset it to the platform default; without this, swapping a plain write for an atomic one would silently widen a `0o600` file to world-readable. A target that does not exist yet gets the platform default, exactly as a plain write would.

Three behaviors are worth knowing before they surprise you:

- Nothing is fsynced. "Atomic" here means no torn reads, not survives-power-loss: A write from which this function has returned can still be lost to a power failure. A durability option is additive if a caller ever needs one.
- A symlink at `filePath` is replaced by a regular file rather than written through, because the rename replaces the target's directory entry. The link's former target is left untouched.
- A failure removes the temp file best-effort and rethrows the error that caused it, never the cleanup's own. Where the cleanup also fails, the temp file survives beside the target under its dot-prefixed name ending in `.tmp`, which is where to look for one.
