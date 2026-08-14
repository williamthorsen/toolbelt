# @williamthorsen/toolbelt.vitest

Utilities for testing with Vitest.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add --save-dev @williamthorsen/toolbelt.vitest
```

Requires Node.js 24 or later. Vitest is a peer dependency: the package uses whichever Vitest 4 the consuming project already installs.

`makeFixture` and `silenceConsole` are candidate tier: imported from `@williamthorsen/toolbelt.vitest/candidate` rather than the package root, and subject to change.

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

### When to reach for it

The question arises only for a resource that has to outlive a single test. One that does not needs no fixture:

```ts
it('falls back to defaults', () => {
  using silent = silenceConsole(['warn']);

  loadSettings({});

  expect(silent.warn).toHaveBeenCalled();
});
```

For a resource shared across tests, the alternative is a hook-registered handle: an object bound once at module level that registers its own `beforeEach` and `afterEach` and forwards every read to whichever instance the current scope built. A handle reads better, because a test names nothing in its signature:

```ts
const tree = useTempTree({ 'src/main.ts': 'export {};\n' });

it('resolves a path within the tree', () => {
  expect(tree.resolve('src/main.ts')).toBe(`${tree.dir}/src/main.ts`);
});
```

That read site is bought per resource type, at around forty lines: a guard reporting reads that arrive outside the scope, a forward per method, and an interface of the handle's own, since a handle cannot forward `[Symbol.dispose]`. The cost pays for itself across many suites and not within one.

`makeFixture` costs nothing per type. It makes the out-of-scope read unrepresentable rather than guarded, the value existing only as a test parameter, and it builds only for the tests that name it, where a handle's `beforeEach` builds for every test in the file.

Reach for a handle where one already exists for the resource and most of a file's tests touch it. Reach for `makeFixture` otherwise.

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
