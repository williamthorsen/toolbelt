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

Returns the item at the index, or throws if the array has no item there.

```ts
import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

const [first] = parseRow(line);
const label = getItemAtIndexOrThrow(columns, first.columnIndex);
```

Its value is narrowing. Under `noUncheckedIndexedAccess`, indexing an array yields `T | undefined`, so every read needs a check or an assertion before the value is usable. This collapses that to `T` or throws, without asserting.

The index must be non-negative. A negative index throws rather than resolving from the end as `Array.prototype.at` would: The function exists to make a violated index invariant loud, and silently reading from the end would turn an off-by-one into a wrong answer. A caller who wants the last item names it:

```ts
getItemAtIndexOrThrow(letters, letters.length - 1);
```

### When it throws

An index naming no item throws a `RangeError`, whether it is negative, reaches past the end of the array, or lands on a hole in a sparse one:

```
No item at index 4 of an array of length 4.
```

The message names the length rather than claiming the index is out of bounds, so the reader can tell the cases apart: An in-range index in the message means the array is sparse.

A non-integer index throws a `TypeError`:

```
Index must be a safe integer, but received 0.5.
```

This covers `NaN` and `Infinity` as well. `Array.prototype.at` truncates a fractional index toward zero, so `at(0.5)` and `at(NaN)` both return the first item; here they fail instead, since neither is a plausible thing to have meant.

An item is returned whatever its value: `0`, `''`, `false`, `null`, and even `undefined` all pass through, because presence at the index is what is tested, not the value read from it. Only absence throws.
