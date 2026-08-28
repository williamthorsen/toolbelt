# Changelog

All notable changes to this project will be documented in this file.

## 0.7.0 — 2026-08-28

### Features

- Report hand-rolled console reads in the adoption kit (#227)

  Adds four console checks to `@williamthorsen/toolbelt.vitest`'s ReadyUp kit, checking for hand-rolled code to capture, silence, or read console output. The kit warns where a capture silently drops arguments, and recommends `silenceConsole` and `listConsoleLines` in place of hand-rolled code.

### Dependencies

- Upgrade all deps to latest version
- Upgrade deps to latest version
- Upgrade all deps to latest version

## 0.6.0 — 2026-08-24

### Features

- Add listConsoleLines to toolbelt.vitest (#226)

  Adds `listConsoleLines` to `@williamthorsen/toolbelt.vitest/candidate`, which returns the lines a spied console method received, one string per call. It reads the spy rather than installing one of its own, so it composes with `silenceConsole` instead of competing for the same slot.

## 0.5.1 — 2026-08-24

### Bug fixes

- Stop the adoption kits from blanking code after `++`, `!`, and keyword-named members (#208)

  Fixes an issue where the `errors`, `numbers`, and `vitest` adoption kits stopped reading a line's code after a postfix `++`, a non-null `!`, or a property spelled like a keyword. The source blanker each kit runs before its anchor scan read the `/` that followed as the opening of a regular expression and blanked to the line's next `/`, so a replaceable idiom written after one of the three went unreported.

  `@williamthorsen/toolbelt.adoption` now takes `blankNonCode` and `getLineAtOffset` from `readyup/check-utils` in place of the copies it held, which had fallen behind readyup's on those three cases.

### Documentation

- Document the `aroundEach`/`aroundAll` pairing in `makeFixture`'s guidance (#209)

  Adds a section to `@williamthorsen/toolbelt.vitest`'s `README.md`, documenting the Vitest hooks that pair with `makeFixture` for a resource installed around a test.

### Internal

- Migrate the adoption kits onto FindingOutcome and add check ids (#217)

  Upgrades `readyup` to 0.32.0 and migrates `defineAdoptionKit` onto the `FindingOutcome` that `buildFindingReport` returns as of 0.31.0.

  Gives every adoption check an `id`, which a consumer's `rdy-ignore` pragma names to suppress that one check; a pragma naming none still silences every check on the line. The kits of `@williamthorsen/toolbelt.errors`, `@williamthorsen/toolbelt.numbers`, and `@williamthorsen/toolbelt.vitest` each declare ids, and `defineAdoptionKit` refuses a kit that gives one id to two checks.

- Hold this repo to its own adoption kits and exempt each package's implementation (#218)

  Removes the exemption that kept this repository out of its own adoption kits. `rdy run --packages` now covers this repo like any other project.

  Each package's own implementation stays exempt, but that exemption now covers the function alone rather than the whole repository.

## 0.5.0 — 2026-08-21

### Features

- Add a ReadyUp adoption kit to `numbers` (#188)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.numbers`. When run against a project, the kit identifies hand-rolled code that can be replaced by the package's `clamp`, `round`, or `pickInteger` functions.

### Bug fixes

- Blank comments and literals before a detector reads a source (#191)

  Fixes the issue that the `errors`, `numbers`, and `vitest` adoption kits' detectors did not distinguish code from comments and literals, and so flagged a pattern written in a comment or a string as a candidate replacement site. Each detector now blanks every comment, string, template literal, and regular expression before its anchor scan, leaving interpolated expressions intact.

### Dependencies

- Upgrade all deps to latest version

### Internal

- Add `packages/adoption` and migrate the `errors` and `vitest` kits onto it (#183)

  Adds `packages/adoption`, a private workspace package holding the source-scanning primitives, path predicates, and kit assembler that the toolbelt packages' ReadyUp adoption kits share, and migrates the `errors` and `vitest` kits onto it. Each kit is now a detector and a declaration; the sweep, the adoption count, and the finding report come from `readyup/check-utils` through `defineAdoptionKit`, the one module that binds to it.

  Adds `__tests__/kit-bundle-freshness.tool.test.ts`, which fails CI when a committed kit bundle falls behind a source it inlines.

## 0.4.0 — 2026-08-16

### Features

- Add `disposeOnTestFinished` for a `Disposable` built inside a test (#180)

  Adds `disposeOnTestFinished` to `@williamthorsen/toolbelt.vitest/candidate`. The new function registers a `Disposable`'s disposal with the running test and returns the resource. A builder taking per-call arguments can wrap its construction in place and hand back a value derived from the resource, leaving the call site with no lifetime code. `makeFixture` remains the function to use for a resource that outlives one test.

## 0.3.0 — 2026-08-15

### Features

- Add makeFixture for Disposable-valued Vitest fixtures (#149)

  Adds `makeFixture` to `@williamthorsen/toolbelt.vitest` at the candidate tier. It adapts a `Disposable` factory into a Vitest `test.extend` fixture that disposes the value when its scope ends, avoiding the need for a mutable top-level binding, a guard, and a hand-written `onCleanup` call. `createTempTree`, `captureStdio`, and `silenceConsole` each compose with it.

- Add throwOnProcessExit and a ReadyUp kit reporting hand-rolled exit mocks (#150)

  Adds `throwOnProcessExit` to `@williamthorsen/toolbelt.vitest`'s candidate tier: a `Disposable` that replaces `process.exit` for a scope with an implementation throwing a `ProcessExitError` carrying the exit code, and that exposes the spy for asserting a path did not exit. It always throws, because a mock that returns lets a test assert against a path the process never reaches, with nothing reporting it.

  Separately, the package ships a ReadyUp kit that reports every use of `vi.spyOn(process, 'exit')` in a consuming project's test files, recommending substitution and identifying defects in `process.exit` mocks.

## 0.2.0 — 2026-08-13

### Features

- Scaffold toolbelt.vitest for Vitest testing utilities (#125)

  Adds `@williamthorsen/toolbelt.vitest`, a package for testing utilities that depend on Vitest. It carries no exports yet.

  Vitest is declared as a `peerDependency` at `^4.0.0`. It is the repo's only peer dependency.

- Add silenceConsole to toolbelt.vitest (#126)

  Adds `silenceConsole`, the first export of `@williamthorsen/toolbelt.vitest`, reachable at the `/candidate` subpath. It silences the named console methods for the enclosing scope and hands back the Vitest spy behind each one, restoring them all when the scope exits; called with no argument it silences all five (`debug`, `error`, `info`, `log`, and `warn`).

### Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
