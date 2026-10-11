<!-- readme-type: library -->

# @williamthorsen/toolbelt.nodejs

Utilities for inspecting Node.js runtimes and toolchains.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.nodejs
```

Requires Node.js 24 or later.

## CLI

For these functions on the command line, use `thor-node` from [`@williamthorsen/nodejs-tools`](https://www.npmjs.com/package/@williamthorsen/nodejs-tools).

## `listStrandedAsdfShims`

```ts
listStrandedAsdfShims(options: {
  dataDir: string;
  pathDirs: readonly string[];
  plugin: string;
  version: string;
}): StrandedAsdfShim[];

interface StrandedAsdfShim {
  readonly backingPackage: string | undefined;
  readonly name: string;
  readonly otherProvider: string | undefined;
  readonly providingVersions: readonly string[];
  readonly shimPath: string;
}
```

Lists the shims of a plugin that a version of it does not provide. Each entry names the versions that provide the command, the first other executable of that name on `pathDirs` outside the shims directory, and the npm package that installed it under a providing version.

```ts
import { findAsdfInstall, listStrandedAsdfShims } from '@williamthorsen/toolbelt.nodejs/candidate';

const install = findAsdfInstall(process.execPath);
if (install !== undefined) {
  const shims = listStrandedAsdfShims({ ...install, pathDirs: process.env['PATH']?.split(':') ?? [] });
  // [{ name: 'pn', providingVersions: ['24.18.1'], backingPackage: 'pnpm', otherProvider: undefined, ... }]
}
```

The function is generic over the plugin except for `backingPackage`, which reads the bin symlink that npm leaves; under another plugin it is `undefined`.

## `findAsdfInstall`

```ts
findAsdfInstall(execPath: string): { dataDir: string; plugin: string; version: string } | undefined;
```

Reads the asdf data directory, plugin, and version out of an executable's install path, or returns `undefined` for an executable that asdf does not manage.

```ts
import { findAsdfInstall } from '@williamthorsen/toolbelt.nodejs/candidate';

findAsdfInstall('/Users/me/.asdf/installs/nodejs/24.20.0/bin/node');
// { dataDir: '/Users/me/.asdf', plugin: 'nodejs', version: '24.20.0' }

findAsdfInstall('/opt/homebrew/bin/node');
// undefined
```

Under asdf, `process.execPath` is the real binary rather than the shim, so a running program can identify its own install without spawning `asdf which`.

## `parseAsdfShim`

```ts
parseAsdfShim(contents: string): { plugin: string; version: string }[];
```

Lists the providers that a shim's `# asdf-plugin:` header declares, in file order, under asdf's own parsing rule.

```ts
import { parseAsdfShim } from '@williamthorsen/toolbelt.nodejs/candidate';

parseAsdfShim('#!/usr/bin/env bash\n# asdf-plugin: nodejs 24.20.0\n# asdf-plugin: nodejs 24.19.0\nexec asdf exec "pnpm" "$@"');
// [{ plugin: 'nodejs', version: '24.20.0' }, { plugin: 'nodejs', version: '24.19.0' }]
```

The header is an asdf implementation detail rather than a documented format; `asdf shimversions <command>` is the supported query, printing one `<plugin> <version>` line per provider.

## `findExecutableOnPath`

```ts
findExecutableOnPath(name: string, dirs: readonly string[], options?: { excludeDir?: string }): string | undefined;
```

Finds the first executable file named `name` in a list of directories, or `undefined` when none provides one. A directory whose real path is that of `excludeDir` is passed over, so a differently spelled PATH entry for it is excluded too.

```ts
import { findExecutableOnPath } from '@williamthorsen/toolbelt.nodejs/candidate';

findExecutableOnPath('node', process.env['PATH']?.split(':') ?? [], { excludeDir: '/Users/me/.asdf/shims' });
// '/opt/homebrew/bin/node', or undefined when only the shim provides it
```

## `resolveNpmPackageOfBin`

```ts
resolveNpmPackageOfBin(binPath: string): string | undefined;
```

Names the npm package that installed a bin, from the symlink that npm leaves in a `bin` directory, or `undefined` when the path is not such a symlink.

```ts
import { resolveNpmPackageOfBin } from '@williamthorsen/toolbelt.nodejs/candidate';

resolveNpmPackageOfBin('/Users/me/.asdf/installs/nodejs/24.18.1/bin/pn');
// 'pnpm', from the target ../lib/node_modules/pnpm/bin/pnpm.mjs
```

## `findPackageManagerPin`

```ts
findPackageManagerPin(startDir: string): { dir: string; manifestPath: string; spec: string } | undefined;
```

Finds the `packageManager` pin that governs a directory: the nearest `package.json` at or above it whose `packageManager` is a string, passing over a manifest without the field, or `undefined` when no ancestor declares one. The value is returned raw, for `parsePackageManagerSpec`.

```ts
import { findPackageManagerPin } from '@williamthorsen/toolbelt.nodejs/candidate';

findPackageManagerPin('/Users/me/repo/packages/lib');
// { dir: '/Users/me/repo', manifestPath: '/Users/me/repo/package.json', spec: 'pnpm@12.4.0' }
```

## `parsePackageManagerSpec`

```ts
parsePackageManagerSpec(spec: string): { hash: string | undefined; name: string; version: string } | undefined;
```

Parses a `packageManager` value into its name, version, and integrity hash, or returns `undefined` when the name or the version is empty. The version ends at the first `+`, so a `+` inside the hash stays in it.

```ts
import { parsePackageManagerSpec } from '@williamthorsen/toolbelt.nodejs/candidate';

parsePackageManagerSpec('pnpm@10.15.0+sha512.abc+def==');
// { hash: 'sha512.abc+def==', name: 'pnpm', version: '10.15.0' }
```

## `findToolVersionsEntry`

```ts
findToolVersionsEntry(
  plugin: string,
  options: { homeDir: string; startDir: string },
): { filePath: string; version: string } | undefined;
```

Finds the `.tool-versions` entry that selects a plugin's version, in asdf's order: the nearest file at or above `startDir` with a line naming the plugin, then the one in `homeDir`. The first version on the line is taken and any fallback after it ignored. Neither an `ASDF_<PLUGIN>_VERSION` variable nor a legacy version file is consulted.

```ts
import { findToolVersionsEntry } from '@williamthorsen/toolbelt.nodejs/candidate';

findToolVersionsEntry('pnpm', { homeDir: '/Users/me', startDir: '/Users/me/repo/packages/lib' });
// { filePath: '/Users/me/repo/.tool-versions', version: '9.0.0' }, or undefined when no file names pnpm
```
