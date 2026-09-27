# @williamthorsen/toolbelt.async

Async utilities.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

Requires Node.js 24 or later.

## Adoption checks

The package includes a ReadyUp kit, so a project that installs it can ask how far its adoption got:

```sh
rdy run --packages
```

The kit reads the project's tracked sources and reports every hand-rolled sleep in them, each counted against the calls that the project already makes into this package. It reports at `recommend` and never at `warn` or `error`, because a hand-rolled sleep is correct code that `delay` expresses better, not a defect.

A promise is claimed when its executor sets a timer and does nothing else. `delay` from `/candidate` replaces it and returns a promise with a `cancel` that clears the timer and settles at once, which the hand-rolled form offers no way to do: A caller that finishes early still waits out the whole delay, and in a test the pending timer keeps the event loop open past the assertion that it was waiting for.

Because the kit claims the executor's whole body rather than a spelling, it admits the concise arrow, the braced body, and the `function` form together. Three neighbouring forms are declined, each for a reason of its own. A timer call taking a third argument settles the promise with that value, whereas `delay` settles with none. A callback that is not the executor's own parameter leaves a promise that never settles, so it is a defect rather than a sleep, and this kit is not the place to say so. A timeout callback that settles the promise _and_ does something else is no sleep either: Because `delay` runs nothing of its own when the timer fires, the substitution would drop that work. A callback wrapping the bare parameter in a function taking nothing is claimed, being the same sleep spelled longer.

`Promise.resolve()` is not claimed, though `flushMicrotasks` is exactly that expression. The platform form is not the weaker alternative here, so the advice would be a rename.

Tests are swept alongside every other source. Each toolbelt kit chooses its own selection: Some exempt tests, and `toolbelt.vitest` reads test files and nothing else. A test that sleeps is sleeping rather than exhibiting a form, and tests contain most instances of this idiom. A sweep exempting tests would report nothing in most projects. Bootstrap wrappers under `bin/` stay exempt: Such a wrapper imports only builtins so that its build-first message survives an incomplete install, and importing this package there would replace that message with a module-resolution failure. A test covering one is swept, since nothing holds it to that constraint. A source that the project declares generated or vendored in its own `.gitattributes`, under `linguist-generated` or `linguist-vendored`, is exempt as well: The sweep drops it before the kit sees it, so committed bundler output yields no advice that anyone could act on. Because the sweep is readyup's, this holds on readyup 0.35.0 or later.

A reviewed site is silenced by an `rdy-ignore` pragma on its own line, or `rdy-ignore-next-line` on the line above. A pragma naming a check's id suppresses that check alone; with no id it covers every check on the line. A failed check prints its id ahead of its fraction, which is the form to write:

```ts
// rdy-ignore-next-line toolbelt.async/no-hand-rolled-sleep -- the caller's abort handler clears the timer
await new Promise((resolve) => setTimeout(resolve, 50));
```

Add the package to `.config/readyup.config.ts` to include it in a routine sweep:

```ts
export default defineRdyConfig({
  packages: ['@williamthorsen/toolbelt.async'],
});
```
