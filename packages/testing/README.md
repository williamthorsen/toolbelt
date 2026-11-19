<!-- readme-type: library -->

# @williamthorsen/toolbelt.testing

Runner-agnostic utilities for testing: capturing errors, output, and warnings, and building throwaway directories and process state.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add --save-dev @williamthorsen/toolbelt.testing
```

Requires Node.js 24 or later. The package imports no test-runner API, so it works under Vitest, Jest, and `node:test` alike. A utility that does need the Vitest API lives in `@williamthorsen/toolbelt.vitest` instead.

Release-tier exports import from the package root and candidate-tier exports from `@williamthorsen/toolbelt.testing/candidate`, as [Exports](#exports) lists them. The root README's [maturity tiers](https://github.com/williamthorsen/toolbelt#maturity-tiers) state what each tier guarantees. Each export's doc comment states its edge cases.

```ts
import { captureStdio } from '@williamthorsen/toolbelt.testing';

using stdio = captureStdio();
await routeCommand(['--version']);
expect(stdio.stdout).toMatch(/^\d+\.\d+\.\d+/u);
```

## Exports

From the package root (release tier):

- `captureError`: Runs a call expected to fail and returns its error, narrowed to an expected class.
- `captureStdio` (`CapturedStdio`, `CaptureStdioOptions`): Captures what is written to stdout and stderr for a scope.
- `pointCwdAt` (`PointCwdAtOptions`, `PointedCwd`): Points `process.cwd()` at a directory for a scope.

From `/candidate` (candidate tier):

- `captureWarnings` (`CapturedWarnings`): Records the process warnings emitted in a scope without printing them.
- `createTempTree` (`CreateTempTreeOptions`, `TempTree`): Builds a throwaway directory tree that is removed when its binding leaves scope.
- `pointArgvAt` (`PointArgvAtOptions`, `PointedArgv`): Points `process.argv` at a set of CLI arguments for a scope.

Each scoped export returns a `Disposable`, so binding it with `using` is what restores the state that it changed.

## Expected errors

`captureError` receives a thrown error and a rejected promise by the same path, and fails the test when the call does not fail as expected:

```ts
import { captureError } from '@williamthorsen/toolbelt.testing';

it('names every unresolvable import', async () => {
  const error = await captureError(UnresolvableKitImportsError, () => loadRemoteKit({ url }));

  expect(error.findings.missing).toStrictEqual([{ specifier: 'readyup/check-utils', names: ['retiredHelper'] }]);
});
```

Naming the class makes the narrowing a type-level fact. `expect(error).toBeInstanceOf(X)` asserts without narrowing, so a test reading `error.cause` or a custom field on the error needs a separate `assert.ok(error instanceof X)` to get there. Called with the thunk alone, `captureError` returns `Error`, which is all a test asserting on the message needs.

## Capturing output

`captureStdio` buffers both streams for the scope. `reset()` empties the buffers, which lets one test compare two invocations of a command:

```ts
using stdio = captureStdio({ isTty: false });

await routeCommand(['verify', '--style', 'plain']);
const first = stdio.stdout;

stdio.reset();
await routeCommand(['verify', '--style', 'plain', '--quiet']);

expect(stdio.stdout).not.toBe(first);
```

A test runner replaces the global console so that it can attribute output to the test that produced it, so `console.log` never reaches `process.stdout.write`. `includeConsole: true` adds console output to the capture.

`captureStdio` swaps its properties by assignment rather than spying on them, so it nests with `silenceConsole` from `@williamthorsen/toolbelt.vitest` in either order:

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

Process warnings take `captureWarnings` instead: Node prints a warning on a later tick, after a stream capture may have closed.

```ts
using captured = captureWarnings();

loadConfig({ legacy: true });

expect(captured.warnings).toMatchObject([{ name: 'DeprecationWarning', code: 'CFG001' }]);
```

## Directories and process state

`createTempTree` builds a tree from a map of paths, a key ending in `/` being a directory, and its handle reads, writes, and removes entries through a check that keeps each path inside the tree. `pointCwdAt` and `pointArgvAt` point the process at it:

```ts
import { pointCwdAt } from '@williamthorsen/toolbelt.testing';
import { createTempTree, pointArgvAt } from '@williamthorsen/toolbelt.testing/candidate';

it('finds the project root from a relative start directory', () => {
  using tree = createTempTree({ '.git/': '', 'src/': '' });
  using _cwd = pointCwdAt(tree.dir);

  expect(findProjectRoot('src').rootDir).toBe(tree.dir);
});

it('pins ESLint to the config named by --config', async () => {
  using _argv = pointArgvAt(['--config', '/project/custom.config.ts']);

  await strictLint();

  expect(constructedWith()).toMatchObject({ overrideConfigFile: '/project/custom.config.ts' });
});
```

`pointCwdAt` replaces `process.cwd` by default, which satisfies code resolving its paths through it; `{ chdir: true }` moves the real process, which a spawned child inherits.

Both pointers swap and restore rather than spy. A spy-based helper cannot nest: `vi.spyOn` hands back the existing spy for a method already spied on, and `restoreMocks: true` restores it between tests, which at fixture scope would silently point a suite back at the real working directory. The swap-and-restore form is immune to both, which is why these utilities live here rather than in `@williamthorsen/toolbelt.vitest`.

A scope disposes at the end of the block that binds it, so a `beforeEach` that opens one has closed it before the test body runs. `disposeOnTestFinished` from `@williamthorsen/toolbelt.vitest` extends the scope to the end of the test, which sets a default for a whole file:

```ts
beforeEach(() => {
  disposeOnTestFinished(pointArgvAt([]));
});
```

## Adoption checks

The package includes a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --sources
```

The kit reads the project's tracked test files and reports the two idioms for which this package publishes a replacement: a thrown value captured by hand, and the output of `process.stdout` or `process.stderr` captured through a spy. An error capture is named by the variable that it fills, and a stdio spy by its location. The kit reports both at `recommend`, never at `warn` or `error`: A capture written by hand works, and `captureError` or `captureStdio` expresses it better rather than correcting it.

Each check prints one fraction, and it measures the kit rather than the check: calls that the project already makes into this package, over those calls plus every site of either idiom that the kit found, less the sites silenced by a pragma for that check. A project containing three stdio spies and no error captures therefore reads `[0 of 3]` against the error-capture check too.

| Check id                       | Reports                                                                    | Severity    |
| ------------------------------ | -------------------------------------------------------------------------- | ----------- |
| `no-hand-rolled-error-capture` | a thrown value captured into a variable declared outside a try             | `recommend` |
| `no-hand-rolled-stdio-capture` | a `vi.spyOn` on the `write` method of `process.stdout` or `process.stderr` | `recommend` |

### What the kit reads

An error capture is claimed only when one import replaces the whole of it. The try block has to be a single call, and the catch block has to assign the caught value to a variable declared outside the try and do nothing else. A catch that logs, rethrows, or branches does work that the substitution would drop, and a try block that keeps a result is doing something `captureError` does not preserve, so neither is reported. A `finally` clause disqualifies a site for the same reason: Because `captureError` throws when the call completes normally, the clause would stop running on that path. A site whose test asserts the caught value `toBe` a literal, such as `{ code: 'ENOENT' }` or a `const` containing one, is not reported either: The call threw something other than an `Error`, on which `captureError` fails the test.

A stdio spy is reported whatever follows it: a mock that silences the stream, one that collects what the stream receives, a return value, or nothing at all. Each spy is its own site, so the kit reports two for a file spying on both streams, though one `captureStdio` replaces both. A read of a spy's recorded calls, such as `spy.mock.calls` or `expect(process.stderr.write).toHaveBeenCalledWith(…)`, is not a site: `captureStdio` replaces it along with the spy.

Not every spy near a stream is read. An assignment to `process.stdout.write` is not, because one that mocks the stream looks the same as one that restores it. A spy on another member, such as `isTTY`, is not, because `captureStdio` would capture that stream's output as well. A spy is read only when its receiver is written `process.stdout` or `process.stderr`, so a spy on a destructured `stdout` is not reported, and neither is `jest.spyOn`.

Sources that are not test files are exempt. Outside a test, a try/catch of an error capture's shape is error handling rather than an unadopted capture. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: Committed bundler output yields no advice that anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

### Silencing a reviewed site

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.testing/no-hand-rolled-error-capture -- the call belongs to the hook
try {
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep, a spelling that readyup 0.40.0 or later reads:

```ts
export default defineRdyConfig({
  sources: ['npm:@williamthorsen/toolbelt.testing'],
});
```
