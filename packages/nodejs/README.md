<!-- readme-type: library -->

# @williamthorsen/toolbelt.nodejs

Utilities for inspecting Node.js runtimes, toolchains, and the commands that they install.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.nodejs
```

Requires Node.js 24 or later.

## CLI

The package ships a `tb-node` command with two subcommands. `asdf-shims` reports the asdf shims that a nodejs version switch has stranded: A CLI installed with `npm install --global` under an earlier version keeps its shim on PATH, and the shim fails when invoked under a version that lacks the package. `pnpm` checks the pnpm that runs in the working directory against the nearest `packageManager` pin.

```sh
pnpm add --global @williamthorsen/toolbelt.nodejs   # puts tb-node on PATH
npx @williamthorsen/toolbelt.nodejs asdf-shims      # or run it without installing
```

The short `npx` form works because the package declares exactly one bin, which npm falls back to, whatever its name.

`tb-node --help`, each subcommand's `--help`, and `tb-node --version` report the surface and the installed version.

### `tb-node asdf-shims`

Reports every asdf shim that names the nodejs plugin but not the active version, classifying each as an orphan, which shadows another executable of that name on PATH, or as having no other provider, and prints the commands that provide or remove it.

```sh
tb-node asdf-shims
# nodejs 24.20.0 (asdf): 1 stranded shim in /Users/me/.asdf/shims
#
# pn: stranded, no other provider on PATH
#   provided by nodejs 24.18.1 (npm package pnpm)
#   to provide it under 24.20.0:
#     npm install --global pnpm
#     asdf reshim nodejs
#   to remove it:
#     ASDF_NODEJS_VERSION=24.18.1 npm uninstall --global pnpm
#     asdf reshim nodejs
```

The active version is the one running the command, read from its install path, so the check spawns no process and needs no repository. A node outside asdf, such as one from Homebrew, is reported as not applicable rather than as clean.

The remedies end with `asdf reshim nodejs` in its versionless form on purpose: It removes every shim and regenerates them from the installed versions, whereas `asdf reshim nodejs <version>` merges into an existing shim and keeps its stale lines. A shim that corepack provides gets `corepack enable` and `corepack disable` in place of the npm commands, led by `npm install --global corepack` where the active version ships no corepack, as Node 25 and later do not. A shim that an installed version of another asdf plugin also provides is not reported, since asdf may resolve the command there. One whose package cannot be read from the install gets the removal of the executable itself.

### `tb-node pnpm`

Checks the pnpm that runs in the working directory against the `packageManager` pin of the nearest `package.json` declaring one, from the working directory upward, and names what provides the `pnpm` on PATH: the asdf pnpm plugin, corepack or an npm-global pnpm under a nodejs version, an asdf shim stranded under the running node, or otherwise its path.

```sh
tb-node pnpm
# pnpm 9.1.0 does not match packageManager pnpm@12.4.0 in /Users/me/repo/package.json
#   pnpm on PATH: /Users/me/.asdf/shims/pnpm, asdf pnpm plugin (selected by /Users/me/repo/.tool-versions)
#   to run the pinned version:
#     asdf install pnpm 12.4.0
#     set pnpm 12.4.0 in /Users/me/repo/.tool-versions
```

The version that runs comes from running `pnpm --version` in the pinned directory, the one process that the command spawns: pnpm 10 and later switch themselves to the pinned version whatever provides them, and corepack selects it, so a version read from the filesystem would report the installed pnpm and false-alarm. That run may download the pinned version on first use. Matching the pin is the healthy state whatever the provider; the mismatch that the check catches is a pnpm older than 10, or one with self-management off, which an asdf pnpm plugin or a stale global install leaves in place.

The provider is read without a spawn: An asdf shim's header names the plugin that provides it, and a `nodejs` shim resolves through the running node's bin symlink to corepack or to an npm-global pnpm; anything else is named by path. Repairs print only where the versions differ, and each installs the pin through whatever provides pnpm now, so no repair switches providers. Without a pin in reach, or with a pin naming another package manager, the command reports the provider alone and exits 3.

### Exit codes

| Code | Meaning                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------- |
| `0`  | The check found nothing to fix                                                                            |
| `1`  | The check found something to fix, with the report on stdout                                               |
| `2`  | Usage or validation error, with the message on stderr                                                     |
| `3`  | Not applicable, with the reason on stderr: the running node is not an asdf install, or no pin is in reach |

```sh
if ! tb-node asdf-shims >/dev/null; then
  echo 'stranded shims: run `tb-node asdf-shims` for the remedies' >&2
fi
```

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

Lists the shims of a plugin that a version of it does not provide, which is what the CLI reports. Each entry names the versions that provide the command, the first other executable of that name on `pathDirs` outside the shims directory, and the npm package that installed it under a providing version.

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
// '/opt/homebrew/bin/node', or undefined where only the shim provides it
```

## `resolveNpmPackageOfBin`

```ts
resolveNpmPackageOfBin(binPath: string): string | undefined;
```

Names the npm package that installed a bin, from the symlink that npm leaves in a `bin` directory, or `undefined` where the path is not such a symlink.

```ts
import { resolveNpmPackageOfBin } from '@williamthorsen/toolbelt.nodejs/candidate';

resolveNpmPackageOfBin('/Users/me/.asdf/installs/nodejs/24.18.1/bin/pn');
// 'pnpm', from the target ../lib/node_modules/pnpm/bin/pnpm.mjs
```

## `findPackageManagerPin`

```ts
findPackageManagerPin(startDir: string): { dir: string; manifestPath: string; spec: string } | undefined;
```

Finds the `packageManager` pin that governs a directory: the nearest `package.json` at or above it whose `packageManager` is a string, passing over a manifest without the field, or `undefined` where no ancestor declares one. The value is returned raw, for `parsePackageManagerSpec`.

```ts
import { findPackageManagerPin } from '@williamthorsen/toolbelt.nodejs/candidate';

findPackageManagerPin('/Users/me/repo/packages/lib');
// { dir: '/Users/me/repo', manifestPath: '/Users/me/repo/package.json', spec: 'pnpm@12.4.0' }
```

## `parsePackageManagerSpec`

```ts
parsePackageManagerSpec(spec: string): { hash: string | undefined; name: string; version: string } | undefined;
```

Parses a `packageManager` value into its name, version, and integrity hash, or returns `undefined` where the name or the version is empty. The version ends at the first `+`, so a `+` inside the hash stays in it.

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
// { filePath: '/Users/me/repo/.tool-versions', version: '9.0.0' }, or undefined where no file names pnpm
```
