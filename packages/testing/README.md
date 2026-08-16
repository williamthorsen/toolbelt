# @williamthorsen/toolbelt.testing

Runner-agnostic utilities for testing.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add --save-dev @williamthorsen/toolbelt.testing
```

Requires Node.js 24 or later. The package declares no dependencies and imports no test-runner API, so it works under Vitest, Jest, and `node:test` alike. A utility that does need the Vitest API lives in `@williamthorsen/toolbelt.vitest` instead.

`captureError`, `captureStdio`, and `pointCwdAt` are candidate tier: imported from `@williamthorsen/toolbelt.testing/candidate` rather than the package root, and subject to change.

## `captureError`

```ts
captureError(run: () => unknown): Promise<Error>;
captureError<E extends Error>(ErrorClass: abstract new (...args: never[]) => E, run: () => unknown): Promise<E>;
```

Runs a call expected to fail and returns the error it threw or rejected with, narrowed to the expected class.

```ts
import { captureError } from '@williamthorsen/toolbelt.testing/candidate';

it('names every unresolvable import', async () => {
  const error = await captureError(UnresolvableKitImportsError, () => loadRemoteKit({ url }));

  expect(error.findings.missing).toStrictEqual([{ specifier: 'readyup/check-utils', names: ['retiredHelper'] }]);
});
```

Naming the class is what makes the narrowing a type-level fact. `expect(error).toBeInstanceOf(X)` asserts without narrowing, so a test reaching `error.cause` or a custom field on the error needs a separate `assert.ok(error instanceof X)` to get there.

The class may be an abstract base, and an error of any subclass satisfies it.

Called with the thunk alone, `captureError` returns `Error`, which is all a test asserting on the message needs:

```ts
const error = await captureError(() => parseConfig('{'));

expect(error.message).toContain('Unexpected end of JSON input');
```

One form serves synchronous and asynchronous calls: the thunk's return value is awaited, so a thrown error and a rejected promise arrive by the same path. The `await` is required either way.

### When the call does not fail as expected

Three cases throw instead of returning, each failing the test with a message naming what happened:

| Case                          | Message                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| The call returned or resolved | `Expected the call to throw, but it returned: 'ok'`                                   |
| It threw a non-`Error`        | `Expected the call to throw Error, but it threw: 'boom'`                              |
| It threw another class        | `Expected the call to throw KitError, but it threw: TypeError: url is not a function` |

The first names no class: with nothing thrown, nothing was compared against one. The last two carry the thrown value as the failure's `cause`, so the real error's stack survives into the report.

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

## `pointCwdAt`

```ts
pointCwdAt(dir: string, options?: PointCwdAtOptions): PointedCwd;
```

Points `process.cwd()` at a directory for the enclosing scope and restores the prior state when the scope exits.

```ts
import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';

it('finds the project root from a relative start directory', () => {
  using tree = createTempTree({ '.git/': '', 'src/': '' });
  using _cwd = pointCwdAt(tree.dir);

  expect(findProjectRoot('src').rootDir).toBe(tree.dir);
});
```

It takes a directory rather than building one, so it works against a temporary tree and a fixture directory checked into the repository alike.

### The two modes

The default replaces `process.cwd` and leaves the process where it is, which satisfies code resolving its paths through `process.cwd()`:

```ts
using cwd = pointCwdAt(tree.dir);
```

`chdir` moves the real process, which is what a spawned child inherits and what code asking the OS rather than Node observes:

```ts
using cwd = pointCwdAt(tree.dir, { chdir: true });
```

A child spawned with no `cwd` option starts in the moved directory under `chdir` and in the test process's own directory under the default.

The split holds inside the process too, on POSIX. A bare relative path handed to `fs` reaches the syscall unchanged, so `fs.readFileSync('config.json')` reads from the real directory under the replacement and from the pointed one under `chdir`. On Windows, Node resolves such a path through `process.cwd()` before the call, so both modes read from the pointed directory. Code resolving through `process.cwd()` first -- `path.resolve`, or `path.join(process.cwd(), …)` -- sees the pointed directory on either platform and in either mode.

`process.chdir` throws `ERR_WORKER_UNSUPPORTED_OPERATION` in a worker thread, so the move needs Vitest's default `pool: 'forks'` and fails under `pool: 'threads'`. The replacement works under either.

Neither mode touches `process.env.PWD`, because `process.chdir` does not touch it either. Code reading that variable rather than calling `process.cwd()` sees the shell's directory in both modes.

### Resolution and rejection

Both modes resolve the argument through `realpathSync` and reject a path naming no existing directory, so one call reports one directory whichever mode it runs in. Without that, macOS would report `/var/folders/…` under the replacement and `/private/var/folders/…` under the move. The resolved path is what the handle reports as `dir`.

A relative path resolves against the directory `process.cwd()` reports, which an enclosing scope may already have pointed elsewhere.

### Nesting

Each scope restores the value it found, so scopes nest in any combination and in any order:

```ts
using _outer = pointCwdAt(tree.dir);
{
  using _inner = pointCwdAt(tree.resolve('packages/app'), { chdir: true });

  expect(process.cwd()).toBe(tree.resolve('packages/app'));
}
expect(process.cwd()).toBe(tree.dir);
```

A move nested inside a replacement reports its own directory, and its restoration puts the process back where it really was rather than where the enclosing scope claimed.

This is what a spy-based helper cannot offer: `vi.spyOn` hands back the existing spy for a method already spied on, and `restoreMocks: true` restores it between tests, which at fixture scope would silently point a suite back at the real working directory. The swap-and-restore form is immune to both, which is why this utility lives here rather than in `@williamthorsen/toolbelt.vitest`.
