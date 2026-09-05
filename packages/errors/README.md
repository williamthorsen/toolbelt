# @williamthorsen/toolbelt.errors

Utilities for working with errors: describing what was thrown, and adding context to it.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.errors
```

## Runtime requirements

No export reaches a `node:` builtin or any other host API, so they run under Node.js 24 or later, Bun, Deno, browsers, and edge runtimes alike.

`describeError` and `isError` are release tier, imported from the package root. `chainError` and `assertIsError` are candidate tier: imported from `@williamthorsen/toolbelt.errors/candidate` rather than the package root, and subject to change.

## `describeError`

```ts
describeError(error: unknown): string;
```

Returns an `Error`'s message, and the stringified value for anything else. A `catch` binding is `unknown` and need not be an `Error` at all, so reporting what was caught otherwise means rewriting the same extraction in every project.

```ts
import { describeError } from '@williamthorsen/toolbelt.errors';

try {
  readConfig();
} catch (error) {
  console.error(`Could not read the config: ${describeError(error)}`);
}
```

An `Error` carrying no message describes as its stringification rather than as the empty string, so a composed message never trails off after its colon. That is `Error` for a plain one, and the class's own `name` where a subclass assigns one:

```ts
describeError(new Error()); // 'Error'
```

Describing never throws. A null-prototype object, a `toString` that throws, and a `message` accessor that throws all describe as `[unstringifiable value]` instead. The `unknown` parameter is a promise to accept any value, and a describer that fails inside a `catch` block discards the very error that it was called to report.

An `Error` whose `message` is not a string is stringified rather than returned as-is, so the declared `string` return holds for every input.

## `chainError`

```ts
chainError(message: string, cause: unknown): Error;
```

Returns an `Error` prefixing `message` to a description of `cause`, and carrying `cause` itself as its `cause` property.

```ts
import { chainError } from '@williamthorsen/toolbelt.errors/candidate';

try {
  readConfig();
} catch (error) {
  throw chainError('Could not read the config', error);
}
// Error: Could not read the config: ENOENT: no such file or directory
```

Attaching the cause is what makes the chain inspectable rather than merely readable, and it happens whatever the cause's type: a handler further up can examine what was actually thrown instead of parsing the text describing it.

Where the runtime implements `Error.captureStackTrace` (Node.js, Deno, Bun, and Chromium), this function's own frame is dropped from the stack, leaving the throwing call site on top. Elsewhere the stack is unmodified.

## `isError` and `assertIsError`

```ts
isError(error: unknown): error is Error;
assertIsError(error: unknown): asserts error is Error;
```

The guard and the assertion for one narrowing. `isError` reports whether a value is an `Error`; `assertIsError` narrows a caught value in place, and throws when it cannot.

Both recognize an `Error` crossing a realm boundary -- from a worker, an iframe, or a `vm` context -- which `instanceof Error` reports as false because the realms hold separate prototype chains. Both also recognize a `DOMException`, `AbortError` and `QuotaExceededError` among them, which an object-tag test alone would miss.

```ts
import { assertIsError } from '@williamthorsen/toolbelt.errors/candidate';

try {
  readConfig();
} catch (error) {
  assertIsError(error);
  console.error(error.message);
}
```

`assertIsError` rethrows the value itself rather than a diagnostic of its own, so a thrown string reaches an outer handler as that string, still available to a handler that knows what to do with it.

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports every `instanceof Error` in them, each named by what it is doing and counted against the calls that the project already makes into this package. A hand-rolled description reports at `warn`, a narrowing or a hand-rolled coercion at `recommend`; nothing reports at `error`, because none of it breaks the package.

A function whose whole body re-implements `describeError` reports once, naming the function, since one import retires the whole helper rather than a single expression.

Bootstrap wrappers under `bin/` are exempt: Such a wrapper imports only builtins so its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they construct error shapes deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: The sweep drops it before the kit sees it, so committed bundler output yields no advice that anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.errors/no-instanceof-error -- the value is constructed in this module
if (error instanceof Error) throw error;
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.errors'],
});
```
