# Changelog

All notable changes to this project will be documented in this file.

## 6.0.2 — 2026-08-24

### Dependency updates

- Bumped `@williamthorsen/toolbelt.numbers` to 7.0.1
- Bumped `@williamthorsen/toolbelt.arrays` to 6.0.1

## 6.0.1 — 2026-08-21

### Bug fixes

- Adopt `clamp` in `obfuscate` and reject a NaN size option (#196)

  Fixes the issue that `obfuscate` returned its input unobfuscated when `bookendSize` was NaN, and returned the bookends with the fill cleared when `fillSize` was NaN. Both options now throw an `Error` naming the offending option.

  Separately, the bookend count is bounded through `clamp` from `@williamthorsen/toolbelt.numbers/candidate` rather than by hand.

## 6.0.0 — 2026-08-16

### Features

- 🚨 **Breaking:** Rename `unindent` to `dedent` and correct its indentation semantics (#171)

  Renames `unindent` to `dedent` in `@williamthorsen/toolbelt.strings/candidate` and corrects five defects in how it removes indentation. Adds `stripCommonIndent`, the same rules as a plain function, for text that arrives at runtime rather than being written in source.

  Migration: `unindent` no longer exists, and nullish and object values are now compile errors. Both exports stay at candidate tier.

### Tests

- Drop expect-type in favor of expectTypeOf (#175)

  Replaces all imports of `expectTypeOf` from `expect-type` with the same import from `vitest`. Previously there had been imports from both libraries. `expect-type` is removed as a dependency.

## 5.0.0 — 2026-08-15

### Features

- 🚨 **Breaking:** Fix unsound narrowing in `getAtIndexOrThrow` and rename it to `getItemAtIndexOrThrow` (#152)

  Fixes an issue where `getAtIndexOrThrow` could falsely treat an `undefined` return value as satisfying a return type that excluded `undefined`. The function now throws a `RangeError` if the array holds no item at the index and a `TypeError` if the index is not a safe integer. `undefined` is a valid return value if the input array's type allows `undefined` elements. The function is renamed `getItemAtIndexOrThrow`.

  Separately, `findOrThrow` now decides a match by its predicate rather than by the value it found, so an element is not treated as not found merely because it is falsy. Its return type is now `T` rather than `NonNullable<T>`.

  Migration: Consumers of `@williamthorsen/toolbelt.arrays/candidate` import `getItemAtIndexOrThrow` in place of `getAtIndexOrThrow`.

## 4.0.1 — 2026-08-13

### Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 4.0.0 — 2026-08-12

### Features

- 🚨 **Breaking:** Rename get* functions by return kind and verb specificity (#119)

  Renames thirteen functions across various packages to align with a consistent naming pattern.

### Refactoring

- Stop shipping test-only and dead support modules (#117)

  Fixes an issue where `@williamthorsen/toolbelt.numbers`, `@williamthorsen/toolbelt.objects`, and `@williamthorsen/toolbelt.strings` each shipped a module that was never importable.

- Align stray modules with layout and TypeScript conventions (#118)

  Aligns all packages with code-layout and annotation conventions, ending a handful of long-standing exceptions. Documentation has been updated to make the conventions clear.

## 3.2.0 — 2026-08-08

### Features

- Use underscore separator at 4 digits or more

  Changes the `unicorn/numeric-separators-style` rule config so that separators are consistently used in base 10 numbers, instead of exempting numbers of 5 digits or less.

### Refactoring

- Fixes violations surfaced by newly active lint rules (#84)
- Fix slug punctuation and require safe integers (#86)

  - Fixes an issue where the use of certain letters as the slug separator in `slugify` would leave punctuation marks in the result.
  - Time-unit conversions, scaling range bounds, normal-distribution interval counts, and array indices in object paths now reject values too large to represent exactly instead of silently losing precision.
  - Seeded number generators now produce distinct sequences for seeds at or beyond 2^53, where adjacent seeds previously collapsed onto nearly identical output. A seed of that size saved before this release no longer reproduces the same output.

- Fix deferred violations of unicorn lint rules (#88)

  Fixes issues surfaced by `unicorn` lint rules that were temporarily downgraded to warnings and restores the rules to "error" severity. Separately, the `Queue` class in `dstructs` has been modified to hide its internal array.

### Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Adopt the centralized tsconfig with more modern settings (#81)

  Raises the language level for typechecking to ES2025, so code across the monorepo can now use `Promise.try`, `RegExp.escape`, the new `Set` methods, and iterator helpers. Typechecking is also stricter: properties reached through an index signature must now be read with bracket access. Published output is unchanged.

- Adopt the mechanical-syntax deferred unicorn rules (#82)

  Promotes ten deferred lint rules from warnings to errors and fixes the issues surfaced by those rules. One published behavior changes as well: Converting a Map to a plain object no longer drops an entry keyed `__proto__`.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

### Dependencies

- Upgrade all deps to latest version

## 3.1.8 — 2026-07-27

### Tooling

- Normalize Vitest, and lint configs

### Documentation

- Change license to ISC

## 3.1.7 — 2026-07-24

### Tooling

- Configure release-kit & repo labels

## 3.1.6 — 2026-07-20

### Bug fixes

- Add repository field to package manifests for npm provenance (#65)

  Fixes an issue that prevented every package from publishing to npm. Each package now links to its source repository from its npm page.

### Dependencies

- Upgrade ESLint packages and migrate to TypeScript 6 (#67)

  Upgrades the toolchain to TypeScript 6 and ESLint 10.

## 3.1.5 — 2026-07-20

### Tooling

- Migrate to the nmr toolchain and resolve dependency vulnerabilities (#45)

  Every monorepo task (build, test, lint, and audit) now runs through the shared `nmr` toolchain instead of the repository's previous hand-rolled scripts, bringing it into line with other repositories.

## 3.1.4 — 2026-03-19

### Formatting

- Format changelogs

## 3.1.1 — 2026-03-10

### Features

- Add string functions
- Add pluralize functions
- Can create a sortable string from a name or title

  Added `toSortableName`

- Can trim strings and ignore other values

  Added `safeTrim` to toolbelt.strings/proposed.

### Refactoring

- Rename functions

### Tests

- ⛔ Add Deno tests for strings library
- Adapt Deno tests to Vitest

### Tooling

- Scaffold the strings workspace
- Enable incremental type generation
- Rename publish script to avoid recursion
- Change package registry from github to npmjs

### Dependencies

- Upgrade all deps to latest version
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

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
