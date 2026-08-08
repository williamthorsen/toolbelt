# @williamthorsen/toolbelt.packaging

Package and project layout utilities for TypeScript and JavaScript: where a package or project boundary begins, and what the manifest at that boundary declares.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.packaging
```

## Runtime requirements

Every export reaches the filesystem through `node:` builtins, so they run under Node.js 24 or later, Bun, and Deno. They do not run in browsers, nor in edge runtimes that expose no filesystem.

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
import { DEFAULT_ROOT_MARKERS, findProjectRoot } from '@williamthorsen/toolbelt.packaging';

findProjectRoot(process.cwd(), { markers: [...DEFAULT_ROOT_MARKERS, 'deno.json'] });
```

Each marker is a path relative to the level it is probed against, on the terms [`listDirectoryChainMatches`](https://github.com/williamthorsen/toolbelt/tree/main/packages/filesystem#listdirectorychainmatches) sets out: one that is absolute, or whose `..` segments escape its level, is rejected before any directory is probed.

When no directory up to and including the filesystem root carries a marker, the result falls back in this order, reporting a `null` marker either way:

1. the nearest ancestor holding a `package.json`, reported as `source: 'package-json'`;
2. `startDir` itself, reported as `source: 'start-dir'`.

The ascent terminates at the filesystem root on every platform, so a Windows drive root or UNC share is as safe a starting point as a POSIX path.

A project root is not a package root: this answers "which checkout am I in", where [`findPackageRoot`](#findpackageroot) answers "which package declares me". A monorepo has one project root and many package roots.

## `findPackageRoot`

Candidate tier: imported from `@williamthorsen/toolbelt.packaging/candidate` rather than the package root, and subject to change.

```ts
findPackageRoot(fromUrl: string): string;
```

Returns the directory of the package that owns a module, which is where assets shipped alongside that package resolve from.

```ts
import path from 'node:path';

import { findPackageRoot } from '@williamthorsen/toolbelt.packaging/candidate';

const templatesDir = path.join(findPackageRoot(import.meta.url), 'templates');
```

Pass `import.meta.url`. A module's own URL is the only input that answers correctly from both a source tree and a compiled one, because the two sit at different depths and no fixed number of `..` hops suits both.

The owning package is the nearest ancestor whose `package.json` declares a `name`. That rule is what distinguishes this from `findPackageJSON` in `node:module`, which answers the different question of which manifest _governs_ a file:

```jsonc
// dist/cjs/package.json -- a marker manifest, declaring no name
{ "type": "commonjs" }
```

A dual-format build leaves that file so the runtime parses `dist/cjs/` as CommonJS. `findPackageJSON` stops there and reports it; `findPackageRoot` passes over it and keeps ascending to the manifest that declares the package's identity.

A module belonging to no named package throws, rather than falling back to a directory that merely looks plausible, which is why the return is a bare string with no evidence to interpret. A manifest that is unreadable as JSON, or that parses to something other than an object, throws by name rather than being skipped: corruption is a defect, not an absence.

## `getSelfVersion`

Candidate tier: imported from `@williamthorsen/toolbelt.packaging/candidate` rather than the package root, and subject to change.

```ts
getSelfVersion(fromUrl: string): string;
```

Returns the version declared by the package that owns a module: the supported way for a CLI to report its own version without hand-rolling a manifest lookup.

```ts
import { getSelfVersion } from '@williamthorsen/toolbelt.packaging/candidate';

console.log(`my-cli ${getSelfVersion(import.meta.url)}`);
```

Ownership is resolved exactly as [`findPackageRoot`](#findpackageroot) resolves it, so a marker manifest is passed over here too. Without that, a dual-format build would read its version as `undefined` rather than raising, since the marker manifest declares none.

A manifest that declares a `name` but no string `version` throws, naming the manifest. The ascent does not continue past it, so a versionless package never reports an ancestor's version as its own.
