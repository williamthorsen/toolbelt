# @williamthorsen/toolbelt.arrays

Array utilities.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.arrays
```

Requires Node.js 24 or later.

`getItemAtIndexOrThrow` is candidate tier: imported from `@williamthorsen/toolbelt.arrays/candidate` rather than the package root, and subject to change.

## `getItemAtIndexOrThrow`

```ts
getItemAtIndexOrThrow<T>(array: ReadonlyArray<T>, index: number): T;
```

Returns the item at the index, or throws if the index names no value.

```ts
import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

const [first] = parseRow(line);
const label = getItemAtIndexOrThrow(columns, first.columnIndex);
```

Its value is narrowing. Under `noUncheckedIndexedAccess`, indexing an array yields `T | undefined`, so every read needs a check or an assertion before the value is usable. This collapses that to `T` or throws, without asserting.

A negative index resolves from the end, as `Array.prototype.at` does, so `-1` is the last item:

```ts
getItemAtIndexOrThrow(['a', 'b', 'c'], -1); // 'c'
```

### When it throws

An index naming no value throws a `RangeError`, whether it reaches past either end of the array or lands on a hole in a sparse one:

```
No value at index 4 of an array of length 4.
```

The message names the length rather than claiming the index is out of bounds, because a read past the end and a hole are indistinguishable from the value alone. The length is what tells the two apart.

A non-integer index throws a `TypeError`:

```
Index must be a safe integer, but received 0.5.
```

This covers `NaN` and `Infinity` as well. `Array.prototype.at` truncates a fractional index toward zero, so `at(0.5)` and `at(NaN)` both return the first item; here they fail instead, since neither is a plausible thing to have meant.

A falsy item is returned rather than treated as absent, so `0`, `''`, `false`, and `null` all pass through. Only `undefined` marks an absent value.
