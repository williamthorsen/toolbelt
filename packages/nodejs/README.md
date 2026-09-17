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

The package ships a `tb-node` command. Its first subcommand reports the asdf shims that a nodejs version switch has stranded: A CLI installed with `npm install --global` under an earlier version keeps its shim on PATH, and the shim fails when invoked under a version that lacks the package.

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

### Exit codes

| Code | Meaning                                                            |
| ---- | ------------------------------------------------------------------ |
| `0`  | No stranded shim                                                   |
| `1`  | One or more stranded shims, with the report on stdout              |
| `2`  | Usage or validation error, with the message on stderr              |
| `3`  | Not applicable: the running node is not an asdf install, on stderr |

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
