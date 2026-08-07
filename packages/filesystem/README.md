# @williamthorsen/toolbelt.filesystem

Filesystem utilities for TypeScript and JavaScript.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.filesystem
```

## Runtime requirements

`findProjectRoot`, `listDirectoryChainMatches`, and `loadConfigCascade` reach the filesystem through `node:` builtins, so they run under Node.js 24 or later, Bun, and Deno. They do not run in browsers, nor in edge runtimes that expose no filesystem. `listDirectoryChain` and `replaceFileExtension` touch no filesystem, so an edge runtime that exposes none runs them; they still import `node:path`, which a browser bundle has to supply.

`loadConfigCascade` imports each config through the host runtime, so a `.ts` config is subject to whatever that runtime does with TypeScript. Node strips types rather than compiling them, which admits erasable syntax alone: an `enum`, a `namespace`, or a parameter property in a config file fails to parse. A `.mjs` or `.js` config sidesteps the question.

## `findProjectRoot`

```ts
findProjectRoot(startDir: string, options?: { markers?: ReadonlyArray<string> }): ProjectRoot;
```

Resolves `startDir` to an absolute path, ascends from it, and returns the first directory carrying a root marker, along with the evidence that identified it:

```ts
interface ProjectRoot {
  marker: string | null; // the marker that matched, or null when a fallback answered
  rootDir: string;
  source: 'marker' | 'package-json' | 'start-dir';
}
```

`DEFAULT_ROOT_MARKERS` is consulted in order, so the earliest entry wins when one directory carries several:

1. `.git`, matching either a directory (an ordinary clone) or a file (a worktree or submodule);
2. `pnpm-workspace.yaml`;
3. `pnpm-lock.yaml`;
4. `package-lock.json`;
5. `yarn.lock`;
6. `bun.lock`.

Passing `markers` replaces that list rather than extending it. Spread `DEFAULT_ROOT_MARKERS` to add to it:

```ts
import { DEFAULT_ROOT_MARKERS, findProjectRoot } from '@williamthorsen/toolbelt.filesystem';

findProjectRoot(process.cwd(), { markers: [...DEFAULT_ROOT_MARKERS, 'deno.json'] });
```

When no directory up to and including the filesystem root carries a marker, the result falls back in this order, reporting a `null` marker either way:

1. the nearest ancestor holding a `package.json`, reported as `source: 'package-json'`;
2. `startDir` itself, reported as `source: 'start-dir'`.

The ascent terminates at the filesystem root on every platform, so a Windows drive root or UNC share is as safe a starting point as a POSIX path.

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

Returns, for each directory in the chain above `startDir`, the first of `names` that exists there:

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

## `loadConfigCascade`

```ts
loadConfigCascade<TConfig>(options: {
  fileNames: ReadonlyArray<string>;
  markers?: ReadonlyArray<string>;
  shouldStopAscent?: (config: TConfig) => boolean;
  startDir: string;
}): Promise<ConfigCascade<TConfig>>;
```

Loads every config file between `startDir` and its project root, nearest first, and reads nothing above that root.

Discovery is [`listDirectoryChainMatches`](#listdirectorychainmatches) bounded at the project root, which [`findProjectRoot`](#findprojectroot) resolves from `markers`: the first of `fileNames` that exists at a level becomes that level's config, a level holding none contributes nothing, and a name that would leave its level is rejected before any file is read.

The matched files are then imported one at a time, and `shouldStopAscent` is consulted after each. Once it returns true, the ascent halts and no farther file is imported at all, rather than being loaded and discarded:

```ts
interface ConfigCascade<TConfig> {
  entries: Array<{
    config: TConfig;
    dir: string; // the cascade level, which differs from the file's own directory for a nested file name
    filePath: string;
  }>;
  projectRoot: ProjectRoot;
  stopReason: 'predicate' | 'project-root';
}
```

A config is the module's default export. A matched module declaring none is rejected by name; validating what a config contains stays with the caller, which is what lets one mechanism serve schemas sharing no fields.

### The `shouldStopAscent` convention

The predicate is the caller's whole stop policy, so any field can drive it. By convention a config declares a boolean `shouldStopAscent`, which a consumer reads directly:

```ts
import { loadConfigCascade } from '@williamthorsen/toolbelt.filesystem';

interface StackConfig {
  rules?: Record<string, string>;
  shouldStopAscent?: boolean;
}

const { entries, projectRoot, stopReason } = await loadConfigCascade<StackConfig>({
  fileNames: ['stack.config.mjs', 'stack.config.js'],
  shouldStopAscent: (config) => config.shouldStopAscent === true,
  startDir: process.cwd(),
});
```

`projectRoot` and `stopReason` are provenance for the caller to surface, so a user can see which directory bounded the cascade and what ended it.

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
