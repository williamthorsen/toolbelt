# @williamthorsen/toolbelt.guards

TypeScript type guards.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

Requires Node.js 24 or later.

## Adoption checks

The package ships a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports every function whose whole body re-implements a guard that this package publishes, naming the function and counting it against the calls that the project already makes into the package. A hand-rolled assertion or type guard reports at `warn` under `no-assertion-clone` and `no-predicate-clone`; a hand-rolled number guard reports at `recommend` under `no-number-guard-clone`, because `isNumber` returns `false` for `NaN` and a bare `typeof` check does not, which makes it the one substitution that changes behavior.

Detection under-matches by design. The guard has to be the function's entire body, and the value tested has to be the function's own first parameter, so a domain assertion that narrows its argument through a call or an `instanceof` reports nothing: No export here could retire such a function.

Bootstrap wrappers under `bin/` are exempt: Such a wrapper imports only builtins so its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. Tests are exempt too, since they write these shapes deliberately. A source declared generated or vendored by the project in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: The sweep drops it before the kit sees it, so committed bundler output yields no advice that anyone could act on. The sweep is readyup's, so this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.guards/no-number-guard-clone -- NaN is a valid input here
function isNumeric(value: unknown): value is number {
  return typeof value === 'number';
}
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.guards'],
});
```
