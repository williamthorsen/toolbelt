<!-- readme-type: library -->

# @williamthorsen/toolbelt.vitest

Utilities for testing with Vitest: scoping resources to a test or a fixture, silencing and reading the console, guarding against stray output, and mocking `process.exit`.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add --save-dev @williamthorsen/toolbelt.vitest
```

Requires Node.js 24 or later. Vitest is a peer dependency: The package uses the Vitest 4 or 5 that the consuming project already installs. Runner-agnostic utilities, such as `captureStdio` and `createTempTree`, live in [`@williamthorsen/toolbelt.testing`](https://github.com/williamthorsen/toolbelt/tree/main/packages/testing#readme).

Release-tier exports import from the package root and candidate-tier exports from `@williamthorsen/toolbelt.vitest/candidate`, as [Exports](#exports) lists them. The root README's [maturity tiers](https://github.com/williamthorsen/toolbelt#maturity-tiers) state what each tier guarantees. Each export's doc comment states its edge cases.

```ts
import { silenceConsole } from '@williamthorsen/toolbelt.vitest';

using silent = silenceConsole(['warn']);
loadSettings({});
expect(silent.warn).toHaveBeenCalledWith('No settings found; using defaults');
```

## Exports

From the package root (release tier):

- `disposeOnTestFinished`: Registers a `Disposable`'s disposal with the current test and returns it unchanged.
- `makeFixture`: Adapts a `Disposable` factory into a Vitest fixture that disposes the value when its scope ends.
- `silenceConsole` (`ConsoleMethod`): Silences console methods for a scope and returns the spy backing each one.
- `throwOnProcessExit` (`MockedProcessExit`, `ProcessExitError`): Replaces `process.exit` for a scope with a mock that throws.

From `/candidate` (candidate tier):

- `failOnUncapturedOutput`: Fails each test that writes to stdout or stderr, or emits a warning, without capturing it.
- `listConsoleLines`: Lists the lines received by a spied console method, one per call.

## Choosing a lifetime

A resource whose lifetime ends with the block that built it needs nothing from this package: Bind it with `using`. The other cases divide by lifetime, not by call site:

- `disposeOnTestFinished` for a resource scoped to one test but built where `using` cannot hold it, such as a builder that returns a value derived from the resource.
- `makeFixture` for a resource that a test reads, at any scope that `test.extend` supports, `file` and `worker` included.
- `aroundEach` or `aroundAll` over a fixture, for a resource installed around a test rather than read by it.

### Inside a builder

```ts
import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { disposeOnTestFinished } from '@williamthorsen/toolbelt.vitest';

function buildSource(files: Record<string, string>, name = 'fixture'): SourceSpec {
  const tree = disposeOnTestFinished(createTempTree(files, { prefix: `compositor-${name}-` }));

  return { id: name, name, origin: { kind: 'directory', location: tree.dir }, dir: tree.dir };
}
```

The builder takes per-call arguments, it returns something other than the resource, and the tree has to outlive the builder's own scope, which rules out `using` inside it. Making the returned value `Disposable` instead distorts the type: A `Catalog` that also deletes temporary directories is the wrong shape, and a builder assembling several trees has several disposals to hand back rather than one.

### As a fixture

```ts
import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { makeFixture } from '@williamthorsen/toolbelt.vitest';
import { expect, it as baseIt } from 'vitest';

const it = baseIt.extend('tree', { scope: 'file' }, makeFixture(() => createTempTree({ 'src/main.ts': 'export {};\n' })));

it('resolves a path within the tree', ({ tree }) => {
  expect(tree.resolve('src/main.ts')).toBe(`${tree.dir}/src/main.ts`);
});
```

The test receives the instance as a typed parameter, so a suite needs no `let`, no guard against an unbuilt instance, and no `onCleanup` call of its own. The examples import `it as baseIt` and extend that, because `vitest/consistent-test-it` resolves an extended function to the name at which its chain is rooted, and `@williamthorsen/eslint-config-typescript` from 21.0.0 requires `it`.

The alternative for a shared resource is a hook-registered handle: an object bound once at module level that registers its own `beforeEach` and `afterEach` and forwards every read to the current instance. A handle reads better, because a test names nothing in its signature, but it takes around forty lines per resource type: a guard against reads outside the scope, a forward per method, and an interface of its own. `makeFixture` needs no code per type, makes the out-of-scope read unrepresentable, and builds only for the tests that name it. Use a handle when one already exists for the resource and most of a file's tests touch it, and `makeFixture` otherwise.

A resource worth building once for a whole run belongs in `globalSetup`, which runs outside the workers.

### Around a test

A pointed working directory serves code that resolves paths through `process.cwd()`, so the tests that need it name no fixture, and a lazily built fixture would leave them running against the real directory. A wrapping hook that requests the fixture builds it for every test:

```ts
const it = baseIt.extend('tree', makeFixture(() => createTempTree({ 'tsconfig.json': '{}\n' })));

it.aroundEach(async (runTest, { tree }) => {
  using _cwd = pointCwdAt(tree.dir);

  await runTest();
});
```

`{ auto: true }` also builds a fixture for every test, and for a resource depending on no other it is the simpler answer. A resource built from another fixture cannot use `makeFixture`, which builds only a fixture without dependencies; the hook needs neither.

`aroundAll` is the file-scoped counterpart, over a `{ scope: 'file' }` fixture: Vitest gives a suite-level hook only file- and worker-scoped fixtures, the types omit a test-scoped one from the hook's context, and the runner fails the suite with `FixtureDependencyError` past the types. A hook registered at file level wraps every test in the file, including those of a second extended API, where a fixture that the API does not declare arrives as `undefined`. Registering the hook inside the `describe` containing its tests scopes it to them.

### Fixtures that depend on other fixtures

Vitest discovers a fixture's dependencies by parsing the fixture function's destructuring pattern, so a dependent fixture writes that pattern and its own disposal:

```ts
const it = test
  .extend('tree', { scope: 'file' }, makeFixture(() => createTempTree({ 'src/main.ts': 'export {};\n' })))
  .extend('project', ({ tree }, { onCleanup }) => {
    const project = openProject(tree.dir); // a Disposable of the consumer's own
    onCleanup(() => project[Symbol.dispose]());
    return project;
  });
```

## Console output

`silenceConsole` returns the spy behind each silenced method, and `listConsoleLines` renders a spy's calls as lines. Because a silence already holds the `vi.spyOn` slot for the method, a helper that read by installing its own spy would take the slot from it; reading the spy handed back composes instead:

```ts
import { silenceConsole } from '@williamthorsen/toolbelt.vitest';
import { listConsoleLines } from '@williamthorsen/toolbelt.vitest/candidate';

it('names the flag it could not parse', () => {
  using silent = silenceConsole(['error']);

  parseArgs(['--colour']);

  expect(listConsoleLines(silent.error)).toStrictEqual(['unknown flag: --colour']);
});
```

## Stray output

Vitest's `silent` option intercepts only `console.*`, so a write to `process.stdout` or `process.stderr` prints between the results of a passing run. `failOnUncapturedOutput`, called from a setup file, holds that output back and fails the test that made it:

```ts
// vitest.setup.ts, listed under `test.setupFiles`
import { failOnUncapturedOutput } from '@williamthorsen/toolbelt.vitest/candidate';

failOnUncapturedOutput();
```

```text
Error: The test produced output that no capture took:
  stderr: "Retrying in 5s\n"
```

A test passes when it takes the output with `captureStdio` or `captureWarnings` from `@williamthorsen/toolbelt.testing`, or with a spy on the stream.

## Process exit

`throwOnProcessExit` replaces `process.exit` with a mock that throws a `ProcessExitError` containing the exit code:

```ts
import { captureError } from '@williamthorsen/toolbelt.testing';
import { ProcessExitError, throwOnProcessExit } from '@williamthorsen/toolbelt.vitest';

it('exits with code 1 on an unknown flag', async () => {
  using _exit = throwOnProcessExit();

  const error = await captureError(ProcessExitError, () => tagCommand(['--unknown']));

  expect(error.code).toBe(1);
});
```

`process.exit` never returns, so a mock that returns breaks the one guarantee made by the call: Execution continues past the exit, and the test asserts against a path that the process never reaches in production. The type system agrees. `process.exit` returns `never`, and a function whose last statement is an exit is sound only because of it; a mock that throws satisfies `never` without a type assertion.

The spy proves that a path does _not_ exit:

```ts
using exit = throwOnProcessExit();

parseArgsOrExit(['--dry-run'], schema);

expect(exit.spy).not.toHaveBeenCalled();
```

## Adoption checks

The package includes a ReadyUp kit. A project that installs it can ask how far its adoption got:

```sh
rdy run --sources
```

The kit reads the project's tracked test files and reports the three idioms for which this package publishes a replacement: a `process.exit` mock, a console method captured or silenced by hand, and a disposal registered by hand on test finish. Each site is named by what it is doing and counted against the calls that the project already makes into this package.

The severity states the judgment. The kit reports a defect at `warn` and a working hand-roll at `recommend`. It reports nothing at `error`, because none of it breaks the package.

Each check prints one fraction, and it measures the kit rather than the check: calls that the project already makes into this package, over those calls plus every site that the kit found of any of the idioms, less the sites silenced by a pragma for that check. A project containing twelve console sites and no exit mocks therefore reads `[0 of 12]` against the exit checks too.

| Check id                         | Reports                                                                   | Severity    |
| -------------------------------- | ------------------------------------------------------------------------- | ----------- |
| `no-exit-sentinel-clone`         | a `process.exit` mock throwing a sentinel class declared by the same file | `warn`      |
| `no-non-throwing-exit-mock`      | a `process.exit` mock that returns                                        | `warn`      |
| `no-hand-rolled-exit-mock`       | a throwing or unreadable `process.exit` mock                              | `recommend` |
| `no-lossy-console-capture`       | a console capture whose parameter list names its arguments                | `warn`      |
| `no-hand-rolled-console-capture` | a console capture keeping every argument, or one that the kit cannot read | `recommend` |
| `no-hand-rolled-console-silence` | a console method silenced with a no-op mock                               | `recommend` |
| `no-console-calls-read`          | a read of a console spy's `mock.calls` or `mock.lastCall`                 | `recommend` |
| `no-hand-rolled-test-disposal`   | an `onTestFinished` callback that disposes a value                        | `recommend` |

### The two defects

A `process.exit` mock that returns lets execution continue past the exit, so the test asserts against a path never reached by the process.

A console capture whose parameter list names its arguments drops every argument past the ones that it names: `console.error('failed:', reason)` asserts as `'failed:'`, and the test passes on a message that the console never wrote. Because a capture taking a rest parameter loses nothing, the kit reports it as a substitution, as it does one that captures nothing at all whatever its parameter list names.

### What the kit reads

Only test files are read, which inverts the exemption that `@williamthorsen/toolbelt.errors` makes. That kit exempts tests because a test constructs error shapes deliberately; each of these idioms exists nowhere else.

Only the five methods that `silenceConsole` covers are anchored, and only through `vi.spyOn`. A spy on `console.table` gets no advice, because the package has none to give, and an assignment such as `console.error = vi.fn()` is not read, because the same anchor matches a restore as readily as a mock.

The kit reports a read of a spy's recorded calls once its receiver resolves to a console spy, either a name bound to one or a member of a `silenceConsole` result. It reports nothing for a read of any other spy's calls, and one chained straight onto the spy call binds no name, so the kit reports it at the spy's own site instead.

The kit reports a mock whose implementation is a bare reference as unclassified rather than as a defect. The referenced function may well throw, or keep every argument, and naming it a defect without reading its body would misreport it.

The kit reports a mock throwing a sentinel class declared by the same file once, naming the class, since one substitution replaces the class and the mock together.

The kit reports a disposal only from inside an `onTestFinished` callback, and only when the callback calls `[Symbol.dispose]()` itself. Both the imported hook and the one taken off the test context are anchors; `disposeOnTestFinished` is not, so the kit reports nothing for an adopting project's own calls. It reports a callback disposing alongside other cleanup too, since the disposal moves to the construction site whatever else the hook does.

Everything else that anchor covers is silent rather than unclassified. Because the other two anchors are their idiom, a mock that the kit cannot read is still a site; `onTestFinished` only hosts one, and most calls to it clean up by other means. Counting those would put every cleanup hook in the project into the fraction shared by all the checks. A callback given as a bare reference and an unbound `resource[Symbol.dispose]` are declined on that footing, and an `AsyncDisposable` disposal has no advice to give besides: `disposeOnTestFinished` takes a sync `Disposable` alone.

### Silencing a reviewed site

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.vitest/no-non-throwing-exit-mock -- the call under test returns first
vi.spyOn(process, 'exit').mockImplementation(() => undefined);
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep, a spelling that readyup 0.40.0 or later reads:

```ts
export default defineRdyConfig({
  sources: ['npm:@williamthorsen/toolbelt.vitest'],
});
```
