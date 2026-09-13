<!-- readme-type: library -->

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

Resolves `startDir` to an absolute path, ascends from it, and returns the first directory that contains a root marker, along with the evidence that identified it:

```ts
interface ProjectRoot {
  marker: string | null; // the marker that matched, or null when a fallback identified the root
  rootDir: string;
  source: 'marker' | 'package-json' | 'start-dir';
}
```

`DEFAULT_ROOT_MARKERS` is consulted in order, so the earliest entry wins when one directory contains several:

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

Each marker is a path relative to the level against which it is probed, on the terms set out by [`listDirectoryChainMatches`](https://github.com/williamthorsen/toolbelt/tree/main/packages/filesystem#listdirectorychainmatches): One that is absolute, or whose `..` segments escape its level, is rejected before any directory is probed.

When no directory up to and including the filesystem root contains a marker, the result falls back in this order, reporting a `null` marker either way:

1. the nearest ancestor holding a `package.json`, reported as `source: 'package-json'`;
2. `startDir` itself, reported as `source: 'start-dir'`.

The ascent terminates at the filesystem root on every platform, so a Windows drive root or UNC share is as safe a starting point as a POSIX path.

A project root is not a package root: This answers "which checkout am I in", where [`findPackageRoot`](#findpackageroot) answers "which package declares me". A monorepo has one project root and many package roots.

## `findPackageRoot`

Candidate tier: Imported from `@williamthorsen/toolbelt.packaging/candidate` rather than the package root, and subject to change.

```ts
findPackageRoot(fromUrl: string): string;
```

Returns the directory of the package that owns a module, which is where assets shipped alongside that package resolve from.

```ts
import path from 'node:path';

import { findPackageRoot } from '@williamthorsen/toolbelt.packaging/candidate';

const templatesDir = path.join(findPackageRoot(import.meta.url), 'templates');
```

Pass `import.meta.url`. A module's own URL is the only input that resolves correctly from both a source tree and a compiled one, because the two sit at different depths and no fixed number of `..` hops suits both.

The owning package is the nearest ancestor whose `package.json` declares a `name`. That rule distinguishes this from `findPackageJSON` in `node:module`, which answers the different question of which manifest _governs_ a file:

```jsonc
// dist/cjs/package.json: a marker manifest, declaring no name
{ "type": "commonjs" }
```

A dual-format build leaves that file so the runtime parses `dist/cjs/` as CommonJS. `findPackageJSON` stops there and reports it; `findPackageRoot` passes over it and keeps ascending to the manifest that declares the package's identity.

A module belonging to no named package throws, rather than falling back to a directory that merely looks plausible, which is why the return is a bare string with no evidence to interpret. A manifest that is unreadable as JSON, or that parses to something other than an object, throws by name rather than being skipped: Corruption is a defect, not an absence.

## `resolveSelfVersion`

Candidate tier: Imported from `@williamthorsen/toolbelt.packaging/candidate` rather than the package root, and subject to change.

```ts
resolveSelfVersion(fromUrl: string): string;
```

Returns the version declared by the package that owns a module: the supported way for a CLI to report its own version without hand-rolling a manifest lookup.

```ts
import { resolveSelfVersion } from '@williamthorsen/toolbelt.packaging/candidate';

console.log(`my-cli ${resolveSelfVersion(import.meta.url)}`);
```

Ownership is resolved exactly as [`findPackageRoot`](#findpackageroot) resolves it, so a marker manifest is passed over here too. Without that, a dual-format build would read its version as `undefined` rather than raising, since the marker manifest declares none.

A manifest that declares a `name` but no string `version` throws, naming the manifest. The ascent does not continue past it, so a versionless package never reports an ancestor's version as its own.

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports one idiom, counted against the calls that the project already makes into this package. It reports at `recommend`: A hand-rolled search is correct code that a published function expresses better, not a defect.

`no-hand-rolled-manifest-search` reports a loop that ascends by `dirname` and probes each level for `package.json`, naming the line on which the loop opens. The scan reads which names a loop probes, but not where the loop starts or what it does with the manifest, so the fix text sets out the choice by purpose. The package that owns the running module takes [`findPackageRoot`](#findpackageroot), or [`resolveSelfVersion`](#resolveselfversion) where the loop goes on to read the manifest's version; both pass over a manifest that declares no name. The project that holds a directory takes [`findProjectRoot`](#findprojectroot), which prefers `.git` and lockfiles to a manifest and so returns the repository root in a monorepo. The nearest manifest, whatever it declares, takes `findDirectoryChainMatch` from `@williamthorsen/toolbelt.filesystem`.

Every other walk up the directory chain belongs to [`@williamthorsen/toolbelt.filesystem`](https://github.com/williamthorsen/toolbelt/tree/main/packages/filesystem#adoption-checks), whose own kit reports it: a loop probing for root markers alone, such as `.git`; a loop probing for a manifest below the level, such as `node_modules/x/package.json`; and a loop that probes nothing. Reporting one here as well would show one loop twice under conflicting advice. A read of `package.json` outside any loop, and a loop over the directories listed by `listDirectoryChain`, ascend nothing by hand, and neither kit reports them.

The detector under-matches by design. A recursive walk-up function is no loop, an ascent written as `path.resolve(dir, '..')` carries a different anchor, and a loop whose body is a single unbraced statement goes unread. A probe for `package.json` made through an intermediate binding, a helper, or a constant names no manifest that the scan can read, and neither does a path holding another binding past the level, as `${dir}/${name}/package.json` does. `toolbelt.filesystem` reports each such loop as a walk instead.

Bootstrap wrappers under `bin/` are exempt: Such a wrapper imports only builtins so its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they write this walk deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: The sweep drops it before the kit sees it, so committed bundler output yields no advice that anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.packaging/no-hand-rolled-manifest-search -- runs before dependencies are installed
while (!fs.existsSync(path.join(dir, 'package.json'))) {
  dir = path.dirname(dir);
}
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.packaging'],
});
```
