# @williamthorsen/toolbelt.vitest

Utilities for testing with Vitest.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add --save-dev @williamthorsen/toolbelt.vitest
```

Requires Node.js 24 or later. Vitest is a peer dependency: the package uses whichever Vitest 4 the consuming project already installs.

`disposeOnTestFinished`, `makeFixture`, `silenceConsole`, and `throwOnProcessExit` are candidate tier: imported from `@williamthorsen/toolbelt.vitest/candidate` rather than the package root, and subject to change.

## `disposeOnTestFinished`

```ts
disposeOnTestFinished<T extends Disposable>(resource: T): T;
```

Registers a `Disposable`'s disposal with the current test and returns it unchanged.

```ts
import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { disposeOnTestFinished } from '@williamthorsen/toolbelt.vitest/candidate';

function buildSource(files: Record<string, string>, name = 'fixture'): SourceSpec {
  const tree = disposeOnTestFinished(createTempTree(files, { prefix: `compositor-${name}-` }));

  return { id: name, name, origin: { kind: 'directory', location: tree.dir }, dir: tree.dir };
}

it('resolves a source directory', () => {
  const source = buildSource({ 'skills/lint/SKILL.md': 'lint' });

  expect(resolveSource(source).files).toHaveLength(1);
});
```

The builder is where this earns its place. It takes per-call arguments, so the resource cannot be built by a no-argument factory; it returns a value derived from the resource rather than the resource itself, so the caller has nothing to bind with `using`; and the tree has to outlive the builder's own scope, so `using` inside the builder would delete it before the test read a byte. Returning the value unchanged is what lets the construction be wrapped in place, leaving the call site with no lifetime code at all.

Making the returned value `Disposable` instead is the alternative, and it distorts the type: a `Catalog` that also deletes temporary directories is the wrong shape, and a builder assembling several trees has several disposals to carry rather than one.

### When to use it, and when to use `makeFixture`

The two divide by lifetime, not by call site:

- `disposeOnTestFinished` for a resource scoped to one test. It registers against whichever test is running, so it works from the test body and from `beforeEach` or `afterEach` alike.
- [`makeFixture`](#makefixture) for a resource that outlives one test. Scope belongs to `test.extend` there, which is what reaches `file` and `worker`.

Outside a test entirely -- at module scope, in a `describe` body, or in `beforeAll` or `afterAll` -- there is no test to register against, and Vitest throws `Hook onTestFinished() can only be called inside a test`. A resource wanted at that scope is a fixture, so `makeFixture` is the answer there rather than a workaround here.

### Order of disposal

Several resources registered in one test dispose in reverse registration order, matching how `using` declarations unwind:

```ts
const tree = disposeOnTestFinished(createTempTree({ 'src/': '' }));
const cwd = disposeOnTestFinished(pointCwdAt(tree.dir));
```

The working directory is restored before the directory it points into is removed.

### Where Vitest's documentation disagrees

Vitest documents `onTestFinished` as honoring `sequence.hooks`, and as not running for a test cancelled by a dynamic `ctx.skip()`. The 4.1 runner does neither: it passes a literal for the finish hooks, so they unwind in reverse whatever that option says, and it runs them for a dynamically skipped test too. The suite pins the skip half, so a runner that stopped disposing there fails here rather than at a consumer. It cannot pin the other: `sequence.hooks` defaults to `stack`, which means reverse whether the runner consults the option or ignores it, so no test under that default can tell the two apart.

## `makeFixture`

```ts
makeFixture<T extends Disposable>(
  build: () => T,
): ({}, { onCleanup }: { onCleanup: (cleanup: () => void) => void }) => T;
```

Adapts a `Disposable` factory into a Vitest fixture that disposes the value when its scope ends.

```ts
import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { makeFixture } from '@williamthorsen/toolbelt.vitest/candidate';
import { expect, test } from 'vitest';

const it = test.extend('tree', { scope: 'file' }, makeFixture(() => createTempTree({ 'src/main.ts': 'export {};\n' })));

it('resolves a path within the tree', ({ tree }) => {
  expect(tree.resolve('src/main.ts')).toBe(`${tree.dir}/src/main.ts`);
});
```

The instance arrives as a typed test parameter, so a suite binding one needs no `let`, no guard against an unbuilt instance, and no `onCleanup` call of its own. Anything satisfying `Disposable` works, including `captureStdio` and `silenceConsole`:

```ts
const it = test
  .extend('stdio', makeFixture(() => captureStdio({ isTty: false })))
  .extend('silent', makeFixture(() => silenceConsole(['warn'])));
```

### When to use it

The question arises only for a resource that has to outlive a single test. One that does not needs no fixture:

```ts
it('falls back to defaults', () => {
  using silent = silenceConsole(['warn']);

  loadSettings({});

  expect(silent.warn).toHaveBeenCalled();
});
```

`using` covers that case only where the resource dies with the block that built it. One built inside a test by a helper that returns something else takes [`disposeOnTestFinished`](#disposeontestfinished) instead.

For a resource shared across tests, the alternative is a hook-registered handle: an object bound once at module level that registers its own `beforeEach` and `afterEach` and forwards every read to whichever instance the current scope built. A handle reads better, because a test names nothing in its signature:

```ts
const tree = useTempTree({ 'src/main.ts': 'export {};\n' });

it('resolves a path within the tree', () => {
  expect(tree.resolve('src/main.ts')).toBe(`${tree.dir}/src/main.ts`);
});
```

That read site is bought per resource type, at around forty lines: a guard reporting reads that arrive outside the scope, a forward per method, and an interface of the handle's own, since a handle cannot forward `[Symbol.dispose]`. The cost pays for itself across many suites and not within one.

`makeFixture` costs nothing per type. It makes the out-of-scope read unrepresentable rather than guarded, the value existing only as a test parameter, and it builds only for the tests that name it, where a handle's `beforeEach` builds for every test in the file.

Use a handle where one already exists for the resource and most of a file's tests touch it, and `makeFixture` otherwise.

A resource that no test names -- one installed around a test rather than read by it -- is a third case, taken up in [Wrapping tests with `aroundEach` and `aroundAll`](#wrapping-tests-with-aroundeach-and-aroundall).

### Wrapping tests with `aroundEach` and `aroundAll`

A resource a test reads is named by that test. A resource installed around a test is not: a pointed working directory exists to serve code resolving paths through `process.cwd()`, so the tests needing it hold no value and name no fixture, and a lazily built fixture leaves them running against the real working directory. Requesting the fixture from a wrapping hook is what builds it:

```ts
const it = test.extend('tree', makeFixture(() => createTempTree({ 'tsconfig.json': '{}\n' })));

it.aroundEach(async (runTest, { tree }) => {
  using _cwd = pointCwdAt(tree.dir);

  await runTest();
});
```

The hook's own parameter list is the request, so the fixture builds for every test whether or not the test names it, and the resource's lifetime is a plain `using` that unwinds when the hook returns.

`{ auto: true }` also builds a fixture for every test, and for a resource depending on no other it is the simpler answer, as [Scope](#scope) describes. It is not the answer for a resource built from another fixture: `makeFixture` cannot build a [dependent fixture](#fixtures-that-depend-on-other-fixtures) at all, so a cwd pointed at a tree has to be hand-written with the disposal that entails. The hook needs neither.

`aroundAll` is the file-scoped counterpart, over a `{ scope: 'file' }` fixture, and the shape is otherwise identical. Vitest gives a suite-level hook only file- and worker-scoped fixtures, and the types enforce it: a test-scoped fixture named there is not a property of the hook's context, and the error lists the fixtures that are. Past the types, the runner throws `FixtureDependencyError` and fails the suite, naming the test-scoped fixtures rather than the available ones.

A hook registered at file level wraps every test in the file, not only the tests of the API it was registered on. A file declaring a second extended API gets the hook over those tests too, and a hook requesting a fixture that API does not carry receives `undefined`: the failure surfaces as a `TypeError` thrown inside the hook and attributed to the test, naming the property that was read rather than the fixture that was missing. Registering the hook inside the `describe` holding the tests scopes it to them, which is the fix where one file needs both; one extended API per file avoids the question.

The suite pins the `aroundEach` request, the `aroundAll` counterpart, and the file-level hook's reach over a second API, so a runner that stopped honoring one fails here rather than at a consumer. It does not pin the `TypeError` above, which can only be observed as a failing test.

### Scope

Scope belongs to `test.extend` rather than to the adapter, so `test`, `file`, and `worker` all work through it. A fixture is built only when a test names it, which is what keeps a temporary directory from being created for tests that never touch one. `{ auto: true }` opts out of that laziness, for a fixture such as a console silencer that should apply whether or not a test names it.

`worker` scope reaches past a single file only where the runner shares a worker between files, which Vitest's default isolation prevents: each file takes its own process, so a worker-scoped fixture builds and disposes once per file exactly as a file-scoped one does. A resource worth building once for a whole run belongs in `globalSetup`, which runs outside the workers and gives up no isolation.

A project setting `restoreMocks: true` restores every spy before each test, so a `silenceConsole` fixture there has to be test-scoped: at `file` or `worker` scope its spies are restored from the second test onward, and the console goes unsilenced with nothing reported. `{ auto: true }` at test scope covers the apply-everywhere case. `createTempTree` and `captureStdio` are unaffected, neither going through `vi.spyOn`.

### Naming the extended test function

`vitest/consistent-test-it` resolves an extended function back to the name its chain was rooted at, so that root has to be the name the rule expects where the tests are written: `test` for tests at file level, `it` for tests inside a `describe`. Rooted at `it` for a `describe` block, a lone `.extend` call is itself reported, and a one-line disable there settles it.

### Fixtures that depend on other fixtures

`makeFixture` serves a fixture that depends on no other fixture. Vitest discovers a fixture's dependencies by parsing the fixture function's source text for its destructuring pattern, so a fixture naming another one has to write that pattern itself, along with its own disposal:

```ts
const it = test
  .extend('tree', { scope: 'file' }, makeFixture(() => createTempTree({ 'src/main.ts': 'export {};\n' })))
  .extend('project', ({ tree }, { onCleanup }) => {
    const project = openProject(tree.dir); // a Disposable of the consumer's own
    onCleanup(() => project[Symbol.dispose]());
    return project;
  });
```

That hand-written disposal is where `unicorn/no-nonstandard-builtin-properties` fires: the rule's `Symbol` allowlist omits `Symbol.dispose` and it accepts no options, so a project on unicorn's `recommended` or `unopinionated` set carries a disable comment at every such site. A dependent resource that only wraps the test needs no fixture of its own, and no disposal to write; see [Wrapping tests with `aroundEach` and `aroundAll`](#wrapping-tests-with-aroundeach-and-aroundall).

Passing a wrapper that takes the context opaquely fails collection with `FixtureParseError`, naming the offending parameter.

## `silenceConsole`

```ts
silenceConsole<M extends ConsoleMethod = ConsoleMethod>(methods?: readonly M[]): Disposable & Record<M, MockInstance>;
```

Silences the given console methods for the enclosing scope and returns the spy backing each one.

```ts
import { silenceConsole } from '@williamthorsen/toolbelt.vitest/candidate';

it('falls back to defaults when settings are missing', () => {
  using silent = silenceConsole(['warn']);

  loadSettings({});

  expect(silent.warn).toHaveBeenCalledWith('No settings found; using defaults');
});
```

Each spy records its calls while suppressing the output, so a console call can be asserted on without reaching the terminal. Binding with `using` is what restores the originals when the block exits.

Called with no argument, it silences all five methods:

```ts
using _silent = silenceConsole();
```

`debug` is among them, so a `console.debug` added to diagnose a failing test goes quiet under the no-argument form. Name the methods explicitly to keep it audible.

Silences do not stack. Vitest's `vi.spyOn` hands back the existing spy for a method already being spied on, so a nested call that overlaps an outer one shares its spy: when the inner scope exits it restores the method for the outer scope too, and the calls the outer scope had recorded are gone. Overlap is easiest to reach through the no-argument form, which claims every method.

The return type narrows to exactly the methods requested, so one that was not silenced is absent from the record:

```ts
using silent = silenceConsole(['error']);

silent.warn; // Property 'warn' does not exist
```

## `throwOnProcessExit`

```ts
throwOnProcessExit(): Disposable & { spy: MockInstance<typeof process.exit> };
```

Replaces `process.exit` for the enclosing scope with an implementation that throws a `ProcessExitError` carrying the exit code.

```ts
import { captureError } from '@williamthorsen/toolbelt.testing/candidate';
import { ProcessExitError, throwOnProcessExit } from '@williamthorsen/toolbelt.vitest/candidate';

it('exits with code 1 on an unknown flag', async () => {
  using _exit = throwOnProcessExit();

  const error = await captureError(ProcessExitError, () => tagCommand(['--unknown']));

  expect(error.code).toBe(1);
});
```

### Why it throws

`process.exit` never returns, so a mock that returns breaks the one guarantee the call makes. Execution continues past the exit, and the test asserts against a path the process never reaches in production. Nothing reports it: the suite passes while covering code that cannot run, and it keeps passing as that dead continuation grows.

The type system says the same thing. `process.exit` is `(code?: number | string | null) => never`, and a function whose last statement is an exit is sound only because of that `never`. Neuter it and the function returns `undefined` while its signature promises a value. A mock that throws satisfies `never` naturally, which is why this one needs no type assertion and no `vi.fn` workaround.

The compiler will not let a test observe the difference directly, either: statements written after a `process.exit` call are unreachable, and TypeScript reports TS7027 rather than compiling them.

### Asserting that nothing exited

The thrown error covers every case except one -- proving a path does _not_ exit. That is what the spy is for:

```ts
using exit = throwOnProcessExit();

parseArgsOrExit(['--dry-run'], schema);

expect(exit.spy).not.toHaveBeenCalled();
```

### The exit code

Node accepts an integer string and exits with its numeric value, so `process.exit('2')` arrives as `2` rather than being discarded. A call naming no code reports `undefined`.

### What it does not cover

`process.exitCode = 1` is a separate mechanism. It sets the code the process will eventually exit with and does not halt execution, so it needs no mock: read the property after the call. Note that a leaked `process.exitCode` makes the whole Vitest run exit non-zero while every test passes, so a test that sets one restores it.

### Mocks do not stack

For the reason `silenceConsole`'s do not: `vi.spyOn` hands back the existing spy for a method already being spied on, so a nested call shares the outer one and restores `process.exit` for both when the inner scope exits.

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked test files and reports every `process.exit` mock in them, each named by what it is doing and counted against the calls the project already makes into this package.

A mock that does not throw reports at `warn`, being a defect rather than a tidy-up: the suite covers a path the process never reaches. A hand-rolled throwing mock reports at `recommend`, being a substitution. Nothing reports at `error`, because none of it breaks the package.

A mock throwing a sentinel class the same file declares reports once, naming the class, since one substitution retires the class and the mock together.

Only test files are read, which inverts the exemption `@williamthorsen/toolbelt.errors` makes. That kit exempts tests because a test constructs error shapes deliberately; a `process.exit` mock exists nowhere else.

A mock whose implementation is a bare reference reports as unclassified rather than as non-throwing. The referenced function may well throw, and naming it a defect without reading its body would misreport it.

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.vitest'],
});
```
