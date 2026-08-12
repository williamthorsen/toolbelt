# @williamthorsen/toolbelt.vitest

Utilities for testing with Vitest.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add --save-dev @williamthorsen/toolbelt.vitest
```

Requires Node.js 24 or later. Vitest is a peer dependency: the package uses whichever Vitest 4 the consuming project already installs.

`silenceConsole` is candidate tier: imported from `@williamthorsen/toolbelt.vitest/candidate` rather than the package root, and subject to change.

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

The return type narrows to exactly the methods requested, so one that was not silenced is absent from the record:

```ts
using silent = silenceConsole(['error']);

silent.warn; // Property 'warn' does not exist
```
