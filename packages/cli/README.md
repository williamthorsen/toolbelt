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

- **`parseArgs(argv, spec, options?)`** parses arguments strictly against a schema of flags and operands, and infers their types from it: A `choices` list narrows a value to a union, `parse` converts it, and `default` makes it non-optional. It rejects an unknown flag, a missing or extra operand, and a value outside `choices`, each as a `ParseError`.
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
