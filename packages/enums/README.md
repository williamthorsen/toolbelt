# @williamthorsen/toolbelt.enums

Functions for working with TypeScript enums.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

Requires Node.js 24 or later.

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports every search of an enum's values with `includes`, naming where it is and counting it against the calls that the project already makes into this package. Each site reports at `recommend` under `no-hand-rolled-enum-membership`: `isEnumValue` returns a type predicate, so it narrows the value where the search does not, and `toEnumValue` replaces a test that only chooses between the value and `undefined`.

The check reports these forms, including the casts that TypeScript requires where the value's type is wider than the enum:

```ts
Object.values(Color).includes(value);
Object.values(Color).includes(value as Color);
(Object.values(Color) as string[]).includes(value);
Object.values<string>(Color).includes(value);
```

The argument to `Object.values` has to be a name or a chain of names, such as `Color` or `Palette.Color`. A search through `indexOf`, `some`, or a `Set`, a values array built apart from the test, and a test of keys report nothing.

A text scan cannot tell an enum from any other object, so a search of an ordinary object's values reports too. Where that object's values are strings or numbers, the advice holds, since `isEnumValue` accepts any such object. Where they are of another type, `isEnumValue` does not apply, and a pragma records that decision at the site.

Bootstrap wrappers under `bin/` are exempt: Such a wrapper imports only builtins so its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they write these forms deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: The sweep drops it before the kit sees it, so committed bundler output yields no advice that anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.enums/no-hand-rolled-enum-membership -- the object maps events to handlers
const registered = Object.values(handlers).includes(handler);
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.enums'],
});
```
