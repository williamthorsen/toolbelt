# Changelog

All notable changes to this project will be documented in this file.

## 0.6.3 — 2026-08-30

### Bug fixes

- Reject a check declaring a kind its detector never produces (#246)

  Fixes an issue where an adoption check could declare a kind its kit's detector never produces. `Kind` was inferred from `checks` and `detect` together, so a typo in a check's `kinds` widened `Kind` rather than failing.

## 0.6.2 — 2026-08-28

### Dependencies

- Upgrade all deps to latest version
- Upgrade deps to latest version
- Upgrade all deps to latest version

## 0.6.1 — 2026-08-24

### Bug fixes

- Stop the adoption kits from blanking code after `++`, `!`, and keyword-named members (#208)

  Fixes an issue where the `errors`, `numbers`, and `vitest` adoption kits stopped reading a line's code after a postfix `++`, a non-null `!`, or a property spelled like a keyword. The source blanker each kit runs before its anchor scan read the `/` that followed as the opening of a regular expression and blanked to the line's next `/`, so a replaceable idiom written after one of the three went unreported.

  `@williamthorsen/toolbelt.adoption` now takes `blankNonCode` and `getLineAtOffset` from `readyup/check-utils` in place of the copies it held, which had fallen behind readyup's on those three cases.

### Internal

- Migrate the adoption kits onto FindingOutcome and add check ids (#217)

  Upgrades `readyup` to 0.32.0 and migrates `defineAdoptionKit` onto the `FindingOutcome` that `buildFindingReport` returns as of 0.31.0.

  Gives every adoption check an `id`, which a consumer's `rdy-ignore` pragma names to suppress that one check; a pragma naming none still silences every check on the line. The kits of `@williamthorsen/toolbelt.errors`, `@williamthorsen/toolbelt.numbers`, and `@williamthorsen/toolbelt.vitest` each declare ids, and `defineAdoptionKit` refuses a kit that gives one id to two checks.

- Hold this repo to its own adoption kits and exempt each package's implementation (#218)

  Removes the exemption that kept this repository out of its own adoption kits. `rdy run --packages` now covers this repo like any other project.

  Each package's own implementation stays exempt, but that exemption now covers the function alone rather than the whole repository.

## 0.6.0 — 2026-08-21

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

## 0.5.0 — 2026-08-15

### Features

- Add throwOnProcessExit and a ReadyUp kit reporting hand-rolled exit mocks (#150)

  Adds `throwOnProcessExit` to `@williamthorsen/toolbelt.vitest`'s candidate tier: a `Disposable` that replaces `process.exit` for a scope with an implementation throwing a `ProcessExitError` carrying the exit code, and that exposes the spy for asserting a path did not exit. It always throws, because a mock that returns lets a test assert against a path the process never reaches, with nothing reporting it.

  Separately, the package ships a ReadyUp kit that reports every use of `vi.spyOn(process, 'exit')` in a consuming project's test files, recommending substitution and identifying defects in `process.exit` mocks.

## 0.4.0 — 2026-08-13

### Features

- 🚨 **Breaking:** Publish a ReadyUp adoption kit and promote isError to release (#139)

  Adds a `default` ReadyUp kit to `@williamthorsen/toolbelt.errors`, allowing a repo consuming that package to check adoption of its functions. The check can trigger a warning or a recommendation, depending on the pattern matched.

  Separately, `isError` now also recognizes an `Error` crossing a realm boundary, and a call to that function replaces an `instanceof` check in `describeError`.

  🚨 **Breaking:** `isError` moves to the release tier and is imported from the package root; the `/candidate` subpath no longer resolves it.

### Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 0.3.0 — 2026-08-12

### Features

- 🚨 **Breaking:** Add reconcileFile to toolbelt.filesystem and promote describeError to release tier (#122)

  Adds `reconcileFile` to `@williamthorsen/toolbelt.filesystem`: an idempotent file write that creates what is missing, refuses by default to replace what is not, and reports which of those it did as a structured outcome rather than throwing.

  Separately, `describeError` is promoted to `@williamthorsen/toolbelt.errors`' release tier, so no release-tier module depends on a candidate one.

  Migration: `describeError` is imported from `@williamthorsen/toolbelt.errors` rather than `@williamthorsen/toolbelt.errors/candidate`, which no longer exports it. `chainError`, `isError`, and `assertIsError` remain at candidate tier.

## 0.2.0 — 2026-08-10

### Features

- Scaffold toolbelt.errors for error-handling utilities (#112)

  Introduces `@williamthorsen/toolbelt.errors`, a new package for working with errors. It carries no exports yet.

- Add describeError, chainError, isError, and assertIsError (#113)

  Adds four helpers for handling a caught value whose type is unknown. `describeError` produces a readable message from any thrown value, including one that is not an `Error`. `chainError` wraps a failure with added context while keeping the original value inspectable rather than flattened into text. `isError` and `assertIsError` narrow a caught value to `Error`. All four are experimental for now, imported from `@williamthorsen/toolbelt.errors/candidate`.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
