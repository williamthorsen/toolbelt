<!-- readme-type: library -->

# @williamthorsen/toolbelt.cli

A parser, help renderer, and command router for command-line tools, typed from one schema per command.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.cli
```

Requires Node.js 24 or later.

## Usage

```ts
import process from 'node:process';

import { defineCommand, defineGroup, runCli } from '@williamthorsen/toolbelt.cli/candidate';

const greet = defineCommand({
  summary: 'Print a greeting',
  flags: { loud: { type: 'boolean', description: 'Shout the greeting', short: 'l' } },
  operands: [{ name: 'name', description: 'Who to greet' }],
  run: ({ flags, operands, stdout }) => {
    const greeting = `Hello, ${operands.name}`;
    stdout.write(`${flags.loud ? greeting.toUpperCase() : greeting}\n`);
  },
});

const root = defineGroup({ summary: 'A demo tool', commands: { greet } });

process.exitCode = await runCli(process.argv.slice(2), root, {
  name: 'demo',
  stdout: process.stdout,
  stderr: process.stderr,
});
```

`demo greet --loud Ada` prints `HELLO, ADA`, `demo --help` and `demo greet --help` print help generated from the definitions, and `demo gret` prints `Error: Unknown command: gret`, `Did you mean 'greet'?`, and `Try 'demo --help'.`, then exits with code 2.

## The three parts

- **`parseArgs(argv, spec, options?)`** parses arguments strictly against a schema of flags and operands, and infers their types from it: A `choices` list narrows a value to a union, `parse` converts it, `default` makes it non-optional, and `multiple` collects a repeated string or path flag into an array. It rejects an unknown flag, a missing or extra operand, and a value outside `choices`, each as a `ParseError`.
- **`renderHelp(node, invocation)`** returns the help page of a command or a group from the same definitions, so that help cannot drift from the flags that a command accepts.
- **`runCli(argv, root, options)`** walks a tree of groups and commands, intercepts `-h`/`--help` at every level, reports any `UsageError` as `Error: <message>` with a pointer to help, and resolves to the exit code. It writes only to the writers that it is given and never calls `process.exit`, so that a test can run a whole CLI in process.

`defineCommand` and `defineGroup` build the tree and validate each definition when it is made, so that a duplicate flag or a misplaced operand fails at startup rather than when a user reaches it.

## Context

A bin that injects effects, such as a client or a logger, declares the context type once with `createCli`. A group's flags are global options, read before its command token, and its `deriveContext` turns them into the context that its commands receive:

```ts
import { createCli, runCli } from '@williamthorsen/toolbelt.cli/candidate';

interface Context {
  log: (message: string) => void;
}

interface ProjectContext extends Context {
  project: string;
}

const { defineGroup } = createCli<Context>();
const { defineCommand } = createCli<ProjectContext>();

const root = defineGroup({
  summary: 'Manage issues',
  flags: { project: { type: 'string', description: 'The project key', short: 'p', default: 'TB' } },
  deriveContext: (flags, context) => ({ ...context, project: flags.project }),
  commands: {
    list: defineCommand({
      summary: 'List open issues',
      run: ({ context }) => context.log(`Listing issues in ${context.project}`),
    }),
  },
});

process.exitCode = await runCli(process.argv.slice(2), root, {
  name: 'issues',
  context: { log: (message) => process.stdout.write(`${message}\n`) },
  stdout: process.stdout,
  stderr: process.stderr,
});
```

A command whose context its group does not supply fails to typecheck. The context-free `defineCommand` and `defineGroup` exports nest under any group.

## Compared with alternatives

[Commander](https://github.com/tj/commander.js) calls `process.exit` unless `exitOverride` is set, and it infers option types only through the separate `@commander-js/extra-typings` package. [Stricli](https://github.com/bloomberg/stricli) is a typed framework without dependencies that owns the application's shape and sets `process.exitCode`. This package has no runtime dependencies either, but it is three functions that a bin composes: Each command's types come from its own schema, effects arrive through injected writers and a typed context, and the bin decides what to do with the exit code. A minimal CLI bundled with esbuild contains about 11 KB of it, minified, or about 4 KB gzipped.

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --sources
```

The kit reads the project's tracked sources and reports two idioms, counted against the calls that the project already makes into this package. Both report at `recommend`: Hand-rolled argument parsing is correct code that this package expresses better, not a defect.

- `no-node-parse-args` reports each call to `parseArgs` from `node:util`, imported by name, under an alias, or through a namespace or default import. The fix is this package's [`parseArgs`](#the-three-parts), which adds operands, `choices`, and types inferred from the schema, and, where the code around the call also writes help or dispatches subcommands, `defineCommand` and `defineGroup` run by `runCli`. A `parseArgs` imported from anywhere else is not reported.
- `no-hand-rolled-flag-scan` reports code that compares a value against a flag name, such as `arg === '--verbose'`, `case '-v':`, or `argv.includes('--help')`. It names each function once, at its first comparison, and a file's top-level code once. The fix is a command tree run by `runCli`, which intercepts `-h`/`--help` at every level and `-V`/`--version` at the root when its `version` option is set.

The detector under-matches by design. Neither check reports a third-party parser such as Commander or yargs, since replacing a dependency is a migration rather than an adoption. Hand-written help text, a subcommand switch that compares no flag, and a comparison against a flag name held in a constant or a variable are not reported either, nor is a `parseArgs` reached through `require('node:util')` or a dynamic `import()`. A comparison inside a class method, an object method, or an unnamed callback counts toward the named function around it, or toward its file's top-level site, so several such parsers in one scope report as one.

Unlike the other toolbelt kits, this one sweeps `bin/` and `src/bin/`, since that is where a command-line runner usually lives. A bootstrap wrapper that only forwards its arguments contains neither idiom, so it is not reported. Tests are exempt, since they write these comparisons deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: The sweep drops it before the kit sees it. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.cli/no-node-parse-args -- the tokenizer that this module wraps
const { tokens } = parseArgs({ args, options, strict: false, tokens: true });
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep, a spelling that readyup 0.40.0 or later reads:

```ts
export default defineRdyConfig({
  sources: ['npm:@williamthorsen/toolbelt.cli'],
});
```
