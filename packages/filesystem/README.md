# @williamthorsen/toolbelt.filesystem

Filesystem utilities for TypeScript and JavaScript.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.filesystem
```

## Runtime requirements

Both functions reach the filesystem through `node:` builtins, so they run under Node.js 24 or later, Bun, and Deno. They do not run in browsers, nor in edge runtimes that expose no filesystem.

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

At each level from `startDir` up to and including the root, the first of `fileNames` that exists becomes that level's config; a level holding none contributes nothing. Each name is a path relative to the level, so a nested location such as `.config/stack.config.mjs` works. A name that would leave its level (an absolute path, or one whose `..` segments escape it) is rejected before any file is read, since following it would breach the bound the cascade exists to enforce. The project root is resolved by `findProjectRoot`, and `markers` is forwarded to it.

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
