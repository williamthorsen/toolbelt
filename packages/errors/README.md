# @williamthorsen/toolbelt.errors

Utilities for working with errors: describing what was thrown, and adding context to it.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.errors
```

## Runtime requirements

No export reaches a `node:` builtin or any other host API, so they run under Node.js 24 or later, Bun, Deno, browsers, and edge runtimes alike.

`describeError` is release tier, imported from the package root. `chainError`, `isError`, and `assertIsError` are candidate tier: imported from `@williamthorsen/toolbelt.errors/candidate` rather than the package root, and subject to change.

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

Describing never throws. A null-prototype object, a `toString` that throws, and a `message` accessor that throws all answer `[unstringifiable value]` instead. The `unknown` parameter is a promise to accept any value, and a describer that fails inside a `catch` block discards the very error it was called to report.

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
