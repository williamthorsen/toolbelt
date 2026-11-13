<!-- readme-type: library -->

# @williamthorsen/toolbelt.filesystem

Filesystem utilities for TypeScript and JavaScript.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.filesystem
```

## Runtime requirements

`findDirectoryChainMatch`, `listDirectoryChainMatches`, `loadConfigCascade`, `reconcileFile`, `reconcileFileFromFile`, and `writeAtomic` access the filesystem through `node:` builtins, so they run under Node.js 24 or later, Bun, and Deno. They do not run in browsers, nor in edge runtimes that expose no filesystem. Because `listDirectoryChain` and `replaceFileExtension` access no filesystem, they run in an edge runtime that exposes none; they still import `node:path`, which a browser bundle has to supply.

`loadConfigCascade` imports each config through the host runtime: A `.ts` config is subject to whatever that runtime does with TypeScript. Node strips types rather than compiling them, which accepts only erasable syntax: An `enum`, a `namespace`, or a parameter property in a config file fails to parse. A `.mjs` or `.js` config avoids the question.

## Adoption checks

The package includes a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --sources
```

The kit reads the project's tracked sources and reports two idioms, each counted against the calls that the project already makes into this package. The kit reports both at `recommend`: They are correct code that a published function expresses better, not defects.

`no-hand-rolled-atomic-write` reports a function body that writes a path stored in a binding and renames that same binding, naming the function that contains it. The check reports nothing for a write alone, a rename alone, a `copyFile` followed by a rename, or a rename of a path that the body never wrote. It reports the site at `recommend` however the temp file is staged, because a text scan cannot tell whether two paths share a volume, and one staged under the system temporary directory is the case worth checking by hand: `rename` is atomic only within one filesystem.

`no-hand-rolled-directory-walk` reports a loop that ascends by `dirname` until it reaches the filesystem root, naming the line on which the loop opens. A loop that only ascends takes [`listDirectoryChain`](#listdirectorychain); one that probes each level for a name takes [`findDirectoryChainMatch`](#finddirectorychainmatch) or [`listDirectoryChainMatches`](#listdirectorychainmatches). The report names the site rather than the shape, so the fix text describes both and the reader chooses from the loop itself. A loop probing for `package.json` is left alone: That site belongs to [`@williamthorsen/toolbelt.packaging`](https://github.com/williamthorsen/toolbelt/tree/main/packages/packaging#readme), whose own kit reports it, and reporting it here would mean seeing one loop twice under conflicting advice.

The walk detector under-matches by design. A recursive walk-up function is no loop, an ascent written as `path.resolve(dir, '..')` has a different anchor, and a loop that computes a parent per item without assigning it back is no ascent. The detector reports none of the three.

Bootstrap wrappers under `bin/` are exempt: Such a wrapper imports only builtins so that its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they write these shapes deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: The sweep drops it before the kit sees it, so committed bundler output yields no advice that anyone could act on. Because the sweep is readyup's, this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.filesystem/no-hand-rolled-directory-walk -- the ascent stops at a ceiling
while (dir !== stopAtDir) {
  dir = path.dirname(dir);
}
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep, a spelling that readyup 0.40.0 or later reads:

```ts
export default defineRdyConfig({
  sources: ['npm:@williamthorsen/toolbelt.filesystem'],
});
```

## `listDirectoryChain`

```ts
listDirectoryChain(startDir: string, options?: { stopAtDir?: string }): [string, ...string[]];
```

Resolves `startDir` to an absolute path and returns it followed by each of its ancestors, nearest first.

```ts
import { listDirectoryChain } from '@williamthorsen/toolbelt.filesystem';

listDirectoryChain('/home/dev/app/src');
// ['/home/dev/app/src', '/home/dev/app', '/home/dev', '/home', '/']
```

## `listDirectoryChainMatches`

```ts
listDirectoryChainMatches(
  startDir: string,
  names: ReadonlyArray<string>,
  options?: { stopAtDir?: string },
): DirectoryChainMatch[];
```

Returns, for each directory in the chain at or above `startDir`, the first of `names` that exists there.

```ts
import { listDirectoryChainMatches } from '@williamthorsen/toolbelt.filesystem';

listDirectoryChainMatches('/home/dev/app/src', ['.git'], { stopAtDir: '/home/dev' });
// [{ dir: '/home/dev/app', entryName: '.git', entryPath: '/home/dev/app/.git' }]
```

## `findDirectoryChainMatch`

```ts
findDirectoryChainMatch(
  startDir: string,
  names: ReadonlyArray<string>,
  options?: { stopAtDir?: string },
): DirectoryChainMatch | undefined;
```

Returns the nearest directory at or above `startDir` that contains one of `names`, or `undefined` when none does.

```ts
import { findDirectoryChainMatch } from '@williamthorsen/toolbelt.filesystem';

findDirectoryChainMatch('/home/dev/app/src', ['.git']);
// { dir: '/home/dev/app', entryName: '.git', entryPath: '/home/dev/app/.git' }
```

## `loadConfigCascade`

```ts
loadConfigCascade<TConfig>(options: {
  fileNames: ReadonlyArray<string>;
  parseConfig: (value: unknown, filePath: string) => TConfig;
  shouldStopAscent?: (config: TConfig) => boolean;
  startDir: string;
  stopAtDir: string;
}): Promise<ConfigCascade<TConfig>>;
```

Loads every config file between `startDir` and `stopAtDir`, nearest first, and passes each default export through `parseConfig`.

```ts
import { loadConfigCascade } from '@williamthorsen/toolbelt.filesystem';

const { entries } = await loadConfigCascade({
  fileNames: ['stack.config.mjs'],
  parseConfig: (value) => value,
  startDir: '/home/dev/app/src',
  stopAtDir: '/home/dev/app',
});
```

## `reconcileFile`

```ts
reconcileFile(
  filePath: string,
  content: string,
  options?: { conflictPolicy?: 'replace' | 'skip'; isDryRun?: boolean },
): FileReconciliation;
```

Writes `content` to `filePath` and reports the outcome, `created`, `overwritten`, `up-to-date`, `skipped`, or `failed`, rather than throwing.

```ts
import { reconcileFile } from '@williamthorsen/toolbelt.filesystem';

reconcileFile('.config/tool.config.ts', template);
// { filePath: '.config/tool.config.ts', outcome: 'created' }
```

## `reconcileFileFromFile`

```ts
reconcileFileFromFile(
  filePath: string,
  sourcePath: string,
  options?: { conflictPolicy?: 'replace' | 'skip'; isDryRun?: boolean },
): FileReconciliation;
```

Reconciles `filePath` against the content of `sourcePath`, as [`reconcileFile`](#reconcilefile) does against content in hand, for a command that copies a bundled template.

```ts
import { reconcileFileFromFile } from '@williamthorsen/toolbelt.filesystem';

reconcileFileFromFile('.config/git-cliff.toml', bundledTemplatePath);
// { filePath: '.config/git-cliff.toml', outcome: 'created' }
```

## `replaceFileExtension`

Proposed tier: Imported from `@williamthorsen/toolbelt.filesystem/proposed` rather than the package root, and subject to change.

```ts
replaceFileExtension(filePath: string, newExtension: string, options?: { oldExtension?: string }): string;
```

Returns `filePath` with its extension replaced.

```ts
import { replaceFileExtension } from '@williamthorsen/toolbelt.filesystem/proposed';

replaceFileExtension('src/main.ts', '.js'); // 'src/main.js'
```

## `writeAtomic`

Candidate tier: Imported from `@williamthorsen/toolbelt.filesystem/candidate` rather than the package root, and subject to change.

```ts
writeAtomic(filePath: string, content: string | Uint8Array): Promise<void>;
```

Writes `content` to `filePath` through a temp file and a rename, so a concurrent reader sees either the previous file or the complete new one, never a partial write.

```ts
import { writeAtomic } from '@williamthorsen/toolbelt.filesystem/candidate';

await writeAtomic('.agents/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
```
