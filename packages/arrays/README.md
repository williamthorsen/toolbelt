# @williamthorsen/toolbelt.arrays

Array utilities.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.arrays
```

Requires Node.js 24 or later.

`findItemOrThrow` and `getItemAtIndexOrThrow` are candidate tier: imported from `@williamthorsen/toolbelt.arrays/candidate` rather than the package root, and subject to change.

## `findItemOrThrow`

```ts
findItemOrThrow<T>(
  items: ReadonlyArray<T>,
  predicate: (item: T, index: number, items: ReadonlyArray<T>) => boolean,
  options?: { label?: string },
): T;
```

Returns the first item satisfying the predicate, or throws if no item does.

```ts
import { findItemOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

const account = findItemOrThrow(accounts, (candidate) => candidate.isActive, { label: 'active account' });
```

Its value is narrowing. `Array.prototype.find` returns `T | undefined`, so every call needs a check or an assertion before the value is usable. This collapses that to `T` or throws, so the call site needs neither.

The predicate alone decides the match. An item satisfying it is returned whatever its value: `0`, `''`, `false`, `null`, and even `undefined` all pass through. `Array.prototype.find` cannot express this, because the `undefined` it returns conflates a missing match with a found `undefined`.

The narrowing is therefore bounded by `T`. Searching a `ReadonlyArray<string | undefined>` yields `string | undefined`, since a match proves an item satisfied the predicate, not that the item is defined. Where the elements themselves are nullable and the result must not be, the caller narrows after the call as it would anywhere else.

### When it throws

No matching item throws an `Error`:

```
Could not find item.
```

`label` replaces `item` in that message, so a caller names what it was looking for:

```ts
findItemOrThrow(users, (user) => user.id === id, { label: `user ${id}` });
// throws Error("Could not find user 42.")
```

## `getItemAtIndexOrThrow`

```ts
getItemAtIndexOrThrow<T>(array: ReadonlyArray<T>, index: number): T;
```

Returns the item at the index, or throws if the array has no item there.

```ts
import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

const fields = parseRow(line);
const label = getItemAtIndexOrThrow(fields, labelColumnIndex);
```

Its value is narrowing. Under `noUncheckedIndexedAccess`, indexing an array yields `T | undefined`, so every read needs a check or an assertion before the value is usable. This collapses that to `T` or throws, so the call site needs neither.

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

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports three hand-rolled idioms in them, each counted against the calls that the project already makes into this package. Two report at `recommend`: they are correct code that a published utility expresses better. The first reports at `warn`, because it is a defect.

A `sort` or `toSorted` comparator is claimed at `warn` where its body decides the order on `Math.random()` and nothing else. Such a comparator does not order consistently, and the engine sorting through it is free to produce any permutation, so the result is neither uniform nor the same across engines. `shuffle` from `/candidate` walks the array backward swapping each item with one drawn at or before it, and takes a seed where a test needs the draw to repeat; `shuffleInPlace` is the mutating form, and a `toSorted` site takes `shuffle`. Claiming the body rather than a spelling is what admits `() => Math.random() - 0.5`, its mirror, and the ternary variants together. A comparator that ranks by its operands and reaches for a draw only to break a tie is not claimed: its body names its own parameters, and `shuffle` does not reproduce it.

A `Math.floor(Math.random() * ...)` expression standing in array-subscript position is claimed, whatever it scales the draw by. `pickItem` from `/candidate` replaces it and takes a seed. It is not a silent substitution: `pickItem` throws on an empty array, where the subscript yields `undefined` and pushes the failure downstream. Where the bound is not the subject's own length, check the substitution before taking it, since `pickItem` draws across the whole array. The same expression outside subscript position belongs to `@williamthorsen/toolbelt.numbers`, whose `pickInteger` covers it, and reporting it here would mean seeing one line twice under conflicting advice.

A ternary wrapping a value in an array is claimed, in either polarity, where both branches name the subject the `Array.isArray` call tested. `arraify` from `/candidate` replaces it. Mind the aliasing: `arraify` always returns a new array, where a ternary handing the array branch straight back returns the caller's own array, and a later mutation of the result reaches it. The substitution is exact only from the spread form, `Array.isArray(x) ? [...x] : [x]`. A ternary choosing between two unrelated values is not claimed, since it is no wrap.

`[...new Set(x)]` is not claimed, though `listUniqueItems` is exactly that expression. The platform form is not the weaker alternative here, so the advice would be a rename.

Bootstrap wrappers under `bin/` are exempt: such a wrapper imports only builtins so its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they write these forms deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: the sweep drops it before the kit sees it, so committed bundler output yields no advice anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.arrays/no-hand-rolled-arraify -- the caller owns the array and never mutates it
const list = Array.isArray(value) ? value : [value];
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.arrays'],
});
```
