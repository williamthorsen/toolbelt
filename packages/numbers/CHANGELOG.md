# Changelog

All notable changes to this project will be documented in this file.

## 7.0.1 — 2026-08-24

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

## 7.0.0 — 2026-08-21

### Features

- 🚨 **Breaking:** Promote clamp to the candidate tier with a stricter bounds contract (#185)

  Promotes `clamp` to `@williamthorsen/toolbelt.numbers/candidate` and tightens its bounds contract: A `NaN` bound now throws a `RangeError`, where it previously returned `NaN` silently. A `NaN` value still passes through. Publishes the bounds type as `ClampBounds`, whose optional properties admit `undefined`, so a bound that may be absent typechecks under `exactOptionalPropertyTypes`.

  Migration: `clamp` is no longer exported from the `/draft` subpath; consumers import it from `/candidate`.

- Add a ReadyUp adoption kit to `numbers` (#188)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.numbers`. When run against a project, the kit identifies hand-rolled code that can be replaced by the package's `clamp`, `round`, or `pickInteger` functions.

### Bug fixes

- Blank comments and literals before a detector reads a source (#191)

  Fixes the issue that the `errors`, `numbers`, and `vitest` adoption kits' detectors did not distinguish code from comments and literals, and so flagged a pattern written in a comment or a string as a candidate replacement site. Each detector now blanks every comment, string, template literal, and regular expression before its anchor scan, leaving interpolated expressions intact.

### Refactoring

- Break the workspace dependency cycle by making `adoption` a leaf (#195)

  Fixes a cyclic dependency among packages in the repo. `packages/adoption` is now a workspace leaf: It declares no workspace dependency, and its test scaffolding is held to node builtins. A new root test fails on any cycle in the workspace dependency graph.

### Dependencies

- Upgrade all deps to latest version

## 6.0.1 — 2026-08-13

### Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 6.0.0 — 2026-08-12

### Features

- 🚨 **Breaking:** Rename get* functions by return kind and verb specificity (#119)

  Renames thirteen functions across various packages to align with a consistent naming pattern.

### Refactoring

- Stop shipping test-only and dead support modules (#117)

  Fixes an issue where `@williamthorsen/toolbelt.numbers`, `@williamthorsen/toolbelt.objects`, and `@williamthorsen/toolbelt.strings` each shipped a module that was never importable.

- Align stray modules with layout and TypeScript conventions (#118)

  Aligns all packages with code-layout and annotation conventions, ending a handful of long-standing exceptions. Documentation has been updated to make the conventions clear.

## 5.0.0 — 2026-08-08

### Features

- 🚨 **Breaking:** Spawn seeded number generator of same subclass (#84)

  A seeded generator spawned from a subclass now matches that subclass, so `IntSeededRng.withSeed` supplies the wrapped function integers where it previously supplied floats. Callers relying on values derived through that path must re-baseline. A detached reference such as `const { withSeed } = SeededRng` now throws.

- Use underscore separator at 4 digits or more

  Changes the `unicorn/numeric-separators-style` rule config so that separators are consistently used in base 10 numbers, instead of exempting numbers of 5 digits or less.

### Refactoring

- Fixes violations surfaced by newly active lint rules (#84)
- Fix slug punctuation and require safe integers (#86)

  - Fixes an issue where the use of certain letters as the slug separator in `slugify` would leave punctuation marks in the result.
  - Time-unit conversions, scaling range bounds, normal-distribution interval counts, and array indices in object paths now reject values too large to represent exactly instead of silently losing precision.
  - Seeded number generators now produce distinct sequences for seeds at or beyond 2^53, where adjacent seeds previously collapsed onto nearly identical output. A seed of that size saved before this release no longer reproduces the same output.

- Fix lint

### Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Adopt the mechanical-syntax deferred unicorn rules (#82)

  Promotes ten deferred lint rules from warnings to errors and fixes the issues surfaced by those rules. One published behavior changes as well: Converting a Map to a plain object no longer drops an entry keyed `__proto__`.

- Adopt four deferred unicorn lint rules (#90)

  The strict-lint severity cap of four lint rules has been raised to error: `no-array-from-fill`, `no-return-array-push`, `no-unreadable-array-destructuring`, and `prefer-math-constants`.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

### Dependencies

- Upgrade all deps to latest version

## 4.3.8 — 2026-07-27

### Tooling

- Normalize Vitest, and lint configs

### Documentation

- Change license to ISC

## 4.3.7 — 2026-07-24

### Tooling

- Configure release-kit & repo labels

## 4.3.6 — 2026-07-20

### Bug fixes

- Add repository field to package manifests for npm provenance (#65)

  Fixes an issue that prevented every package from publishing to npm. Each package now links to its source repository from its npm page.

### Dependencies

- Upgrade ESLint packages and migrate to TypeScript 6 (#67)

  Upgrades the toolchain to TypeScript 6 and ESLint 10.

## 4.3.5 — 2026-07-20

### Tooling

- Migrate to the nmr toolchain and resolve dependency vulnerabilities (#45)

  Every monorepo task (build, test, lint, and audit) now runs through the shared `nmr` toolchain instead of the repository's previous hand-rolled scripts, bringing it into line with other repositories.

## 4.3.4 — 2026-03-19

### Formatting

- Format changelogs

## 4.3.1 — 2026-03-10

### Features

- Add string functions
- Add number functions
- Add integer string functions
- Caller can specify fallback value for safeParseInteger
- Allow error as safeParseInteger fallback
- Add safeParseNumber

### Refactoring

- Rename functions

### Tests

- Adapt Deno tests to Vitest

### Tooling

- Scaffold the numbers workspace
- Enable incremental type generation
- Rename publish script to avoid recursion
- Change package registry from github to npmjs

### Dependencies

- Adapt to dependency upgrades and bump Node engine to >=24 (#8)

  Upgrades all dependencies to their latest versions, bumps the Node.js engine requirement from >=18.17.0 to >=24.0.0 across all 13 workspace packages, and adapts source code to satisfy new lint rules introduced by the upgraded ESLint plugins. Also upgrades `@williamthorsen/eslint-config-typescript` from 5.12.1 to 5.12.2 to fix ESM import issues in the compiled output.

  Commit details:

  - root|deps: Upgrade all deps to latest version

  - root|refactor: Fix lint

  - root|deps: Upgrade all deps to latest minor version

  - root|deps: Allow unpatchable vulns in dev deps

  - root|refactor: Adapt to dependency upgrades and bump Node engine to >=24
  * Upgrade eslint-config-typescript to 5.12.2 (fixes ESM import issues, removes need for pnpm patch)
  * Bump engines.node from >=18.17.0 to >=24.0.0 across all packages
  * Update CI to Node 24.14.0 and pnpm 10.30.3
  * Replace .sort() with .toSorted() to satisfy unicorn/no-array-sort
  * Fix lint errors: remove useless default assignments, redundant type constituents, deprecated re-exports, and empty array args to Set constructor
  - datetime|tests: Fix locale mismatch in Timestamp test

  Pass the same 'en-US' locale to both the expected-value computation and
  the method under test. Previously the test used the system default locale
  for the expected value but explicit 'en-US' for the actual call, which
  diverged under Node 24's updated Intl formatting.

  - root|refactor: Replace toThrow with toThrowError across all tests

  The vitest/no-alias-methods rule in strict-lint requires the canonical
  toThrowError() name instead of the toThrow() alias.

  - root|refactor: Fix remaining strict-lint errors
  * Use import() in vi.mock for vitest/prefer-import-in-mock
  * Replace expect(typeof x).toBe() with expectTypeOf for vitest/prefer-expect-type-of
  * Use String.raw for regex escapes for unicorn/prefer-string-raw
  - root|tooling: Use ws runner to fix recursive build command

  The build script used `pnpm --recursive run build` but no workspace package defines a `build` script — they all use `ws build` through the workspace script runner. Aligns with all other recursive commands.

### Documentation

- Fix lint

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
