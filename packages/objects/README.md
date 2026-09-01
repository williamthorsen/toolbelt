# @williamthorsen/toolbelt.objects

Functions for working with objects.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

Requires Node.js 24 or later.

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports three hand-rolled idioms in them, each counted against the calls that the project already makes into this package. Two report at `recommend`: they are correct code that a published utility expresses better. The third reports at `warn`, because it is a defect.

A `hasOwnProperty` call reached through `Object.prototype` is claimed. `Object.hasOwn` is the platform form and is enough wherever the result narrows nothing; `hasOwnProperty` from `/candidate` earns its place by returning a type predicate that narrows the target, which `Object.hasOwn` does not. The unguarded call on the value itself is not claimed: it is a defect rather than a verbose spelling, and eslint's recommended `no-prototype-builtins` already reports it.

A record guard is claimed where a conjunction pairs a test against the `object` tag with a test against `null`, in either order, and ends there or at a matching `!Array.isArray`. `isRecord` replaces the longer form and `isRecordOrArray` the shorter, and both return a type predicate, so the narrowing the conjunction performed is preserved. A conjunction carrying a further operand, such as `typeof err === 'object' && err !== null && 'code' in err`, is not claimed: adoption there is a rewrite rather than a substitution. `isPlainObject` answers the stricter question of whether a value carries `Object.prototype` and nothing exotic, and no expression the kit claims asks it.

An equality test between two `JSON.stringify` calls is claimed at `warn`, and its `!==` mirror with it. Comparing serializations answers the wrong question twice: the result is key-order dependent, so two objects carrying the same entries in a different order compare unequal, and a `Set` serializes as an empty object whatever it holds, so any two `Set`s compare equal. `isEqual` from `/candidate` sorts keys and converts `Set`s to arrays before comparing. A call the source compares against anything else is serializing rather than comparing, and is not claimed.

Bootstrap wrappers under `bin/` are exempt: such a wrapper imports only builtins so its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they write these forms deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: the sweep drops it before the kit sees it, so committed bundler output yields no advice anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.objects/no-hand-rolled-record-guard -- the value is validated upstream
const ok = typeof value === 'object' && value !== null;
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.objects'],
});
```
