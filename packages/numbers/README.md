# @williamthorsen/toolbelt.numbers

Utility functions for working with numbers.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.numbers
```

Requires Node.js 24 or later.

`clamp`, `round`, and `pickInteger` are candidate tier: imported from `@williamthorsen/toolbelt.numbers/candidate` rather than the package root, and subject to change.

## `clamp`

```ts
clamp(value: number, bounds: { min?: number; max?: number }): number;
```

Returns the value constrained to the inclusive bounds; an omitted bound leaves that side unconstrained. A reversed range or a `NaN` bound throws a `RangeError`, where the `Math.max(min, Math.min(max, value))` idiom it replaces returns a value for both. A `NaN` value passes through.

```ts
import { clamp } from '@williamthorsen/toolbelt.numbers/candidate';

clamp(15, { min: 0, max: 10 }); // 10
clamp(-5, { min: 0 }); // 0
```

## `round`

```ts
round(value: number, nDecimalPlaces?: number): number;
```

Returns the value rounded to the given number of decimal places, or to a whole number where none is given.

```ts
import { round } from '@williamthorsen/toolbelt.numbers/candidate';

round(3.14159, 2); // 3.14
```

## `pickInteger`

```ts
pickInteger(params?: { min?: number; max?: number; seed?: Seed }): number;
```

Returns a random integer between the bounds, **inclusive** of both, and truncates a non-integer bound. Passing a seed makes the draw deterministic, which is what a test wants.

Mind the bound when replacing `Math.floor(Math.random() * n)`: that idiom stops at `n - 1`, so the equivalent is `pickInteger({ max: n - 1 })`.

```ts
import { pickInteger } from '@williamthorsen/toolbelt.numbers/candidate';

pickInteger({ min: 1, max: 6 }); // 1 through 6
```

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports every hand-rolled clamp, decimal rounding, and random integer in them, each counted against the calls the project already makes into this package. All three report at `recommend`: they are correct code that a published utility expresses better, not defects.

A random integer used as an array subscript is left alone. That site belongs to `@williamthorsen/toolbelt.arrays`, whose `pickItem` covers it, and reporting it here would mean seeing one line twice under conflicting advice.

Bootstrap wrappers under `bin/` are exempt: such a wrapper imports only builtins so its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they compute these values deliberately. A source the project declares generated or vendored in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: the sweep drops it before the kit sees it, so committed bundler output yields no advice anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.numbers/no-hand-rolled-clamp -- a reversed range is unreachable here
const bounded = Math.max(min, Math.min(max, value));
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.numbers'],
});
```
