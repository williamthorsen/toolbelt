# @williamthorsen/toolbelt.testing

Runner-agnostic utilities for testing.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add --save-dev @williamthorsen/toolbelt.testing
```

Requires Node.js 24 or later. The package declares no dependencies and imports no test-runner API, so it works under Vitest, Jest, and `node:test` alike. A utility that does need the Vitest API lives in `@williamthorsen/toolbelt.vitest` instead.

`captureStdio` is candidate tier: imported from `@williamthorsen/toolbelt.testing/candidate` rather than the package root, and subject to change.

## `captureStdio`

```ts
captureStdio(options?: CaptureStdioOptions): CapturedStdio;
```

Captures everything written to `process.stdout` and `process.stderr` for the enclosing scope, and restores both streams when it exits.

```ts
import { captureStdio } from '@williamthorsen/toolbelt.testing/candidate';

it('reports the version', async () => {
  using stdio = captureStdio();

  await routeCommand(['--version']);

  expect(stdio.stdout).toMatch(/^\d+\.\d+\.\d+/u);
});
```

Binding with `using` is what restores the streams. Nothing else does, so a capture bound with `const` leaves both streams swapped for the rest of the file.

### Reading the output

`stdout` and `stderr` join everything written to each stream. `stdoutChunks` and `stderrChunks` give the individual writes, for a test asserting on where the boundaries fell:

```ts
using stdio = captureStdio();

await routeCommand(['verify', '--json']);

expect(stdio.stdoutChunks).toStrictEqual(['{"worstSeverity":null}\n']);
```

Each chunk list is a copy, so one read before a `reset()` is not emptied underneath the caller.

`reset()` empties both buffers, which is what lets a single test compare two invocations of one command:

```ts
using stdio = captureStdio();

await routeCommand(['verify', '--style', 'plain']);
const first = stdio.stdout;

stdio.reset();
await routeCommand(['verify', '--style', 'plain', '--quiet']);

expect(stdio.stdout).not.toBe(first);
```

### Capturing console output

A test runner replaces the global console so it can attribute output to the test that produced it. Vitest and Jest both do, which means `console.log` never reaches `process.stdout.write` and a stream capture does not see it. `includeConsole` folds it in:

```ts
using stdio = captureStdio({ includeConsole: true });

await routeCommand(['init']);

expect(stdio.stdout).toContain('[dry-run mode]');
```

Output is routed as Node routes it: `console.debug`, `console.info`, and `console.log` join stdout, while `console.warn` and `console.error` join stderr. Arguments pass through `node:util`'s `format`, so `console.info('found %d', 3)` buffers as `found 3\n`.

The option is off by default. With it off, console output still reaches the test reporter, which is where it is wanted while diagnosing a failure.

### Controlling `isTTY`

`isTty` sets `isTTY` on both streams for the scope, which exercises a command's style detection without an assignment to `process.stdout.isTTY` that outlives the test:

```ts
using stdio = captureStdio({ isTty: false });

await routeCommand(['verify']);

expect(stdio.stdout).toContain('[PASS] passing');
```

Both streams are saved and restored whether or not the option is passed, so the value cannot leak into later tests either way. Restoration puts back the state it found: a stream that owned no `isTTY` owns none again afterwards, rather than being left holding `undefined`.

Style detection reads the stream it writes to, so the value is set on both. A test needing them to differ has to assign directly.

### Composing with `silenceConsole`

`captureStdio` swaps its properties by assignment rather than spying on them, so it nests with `silenceConsole` from `@williamthorsen/toolbelt.vitest` in either order. The innermost scope wins, and the outer one resumes intact when it exits:

```ts
using stdio = captureStdio({ includeConsole: true });

console.info('captured');
{
  using _silent = silenceConsole(['info']);
  console.info('swallowed by the inner scope');
}
console.info('captured again');

expect(stdio.stdout).toBe('captured\ncaptured again\n');
```

The reverse order holds too: a capture opened inside a silence takes the output for its own scope and hands the console back on exit, with the calls the silence had recorded still intact.
