# Changelog

All notable changes to this project will be documented in this file.

## 0.8.2 — 2026-08-21

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 6.0.0
- Bumped `@williamthorsen/toolbelt.numbers` to 7.0.0

## 0.8.1 — 2026-08-16

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 5.0.1

## 0.8.0 — 2026-08-15

### Features

- 🚨 **Breaking:** Fix unsound narrowing in `getAtIndexOrThrow` and rename it to `getItemAtIndexOrThrow` (#152)

  Fixes an issue where `getAtIndexOrThrow` could falsely treat an `undefined` return value as satisfying a return type that excluded `undefined`. The function now throws a `RangeError` if the array holds no item at the index and a `TypeError` if the index is not a safe integer. `undefined` is a valid return value if the input array's type allows `undefined` elements. The function is renamed `getItemAtIndexOrThrow`.

  Separately, `findOrThrow` now decides a match by its predicate rather than by the value it found, so an element is not treated as not found merely because it is falsy. Its return type is now `T` rather than `NonNullable<T>`.

  Migration: Consumers of `@williamthorsen/toolbelt.arrays/candidate` import `getItemAtIndexOrThrow` in place of `getAtIndexOrThrow`.

## 0.7.1 — 2026-08-13

### Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 0.7.0 — 2026-08-12

### Features

- 🚨 **Breaking:** Rename get* functions by return kind and verb specificity (#119)

  Renames thirteen functions across various packages to align with a consistent naming pattern.

### Refactoring

- Align stray modules with layout and TypeScript conventions (#118)

  Aligns all packages with code-layout and annotation conventions, ending a handful of long-standing exceptions. Documentation has been updated to make the conventions clear.

## 0.6.0 — 2026-08-08

### Features

- Correct standard-deviation semantics in statistics normal-distribution functions (#93)

  The `standardDeviation` parameter now means the standard deviation throughout the package's normal-distribution functions, where it previously behaved as the variance. Callers who pass the default of 1 see unchanged output; any other value now yields different numbers. A standard deviation of 0 now places all mass at the mean, where it previously spread mass evenly across every interval; an even spread is now what a very large standard deviation approaches.

  `getNormalIntervalProbabilities` accepts a new optional `halfWidth` that sizes the window it slices into intervals, defaulting to 3. `findDistributionByIntervalProbability` now takes its search controls as a second argument and reports whether the search converged, measures `tolerance` as a fraction of the target rather than as an absolute difference, and rejects an unreachable target with an error naming the bound it fell outside and the probability reachable there. Both functions now reject any numeric input that is not a finite number, instead of silently returning NaN results.

- Use underscore separator at 4 digits or more

  Changes the `unicorn/numeric-separators-style` rule config so that separators are consistently used in base 10 numbers, instead of exempting numbers of 5 digits or less.

### Refactoring

- Fix slug punctuation and require safe integers (#86)

  - Fixes an issue where the use of certain letters as the slug separator in `slugify` would leave punctuation marks in the result.
  - Time-unit conversions, scaling range bounds, normal-distribution interval counts, and array indices in object paths now reject values too large to represent exactly instead of silently losing precision.
  - Seeded number generators now produce distinct sequences for seeds at or beyond 2^53, where adjacent seeds previously collapsed onto nearly identical output. A seed of that size saved before this release no longer reproduces the same output.

- Fix deferred violations of unicorn lint rules (#88)

  Fixes issues surfaced by `unicorn` lint rules that were temporarily downgraded to warnings and restores the rules to "error" severity. Separately, the `Queue` class in `dstructs` has been modified to hide its internal array.

### Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Adopt the mechanical-syntax deferred unicorn rules (#82)

  Promotes ten deferred lint rules from warnings to errors and fixes the issues surfaced by those rules. One published behavior changes as well: Converting a Map to a plain object no longer drops an entry keyed `__proto__`.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

## 0.5.3 — 2026-07-27

### Tooling

- Normalize Vitest, and lint configs

### Documentation

- Change license to ISC

## 0.5.2 — 2026-07-24

### Tooling

- Configure release-kit & repo labels

## 0.5.1 — 2026-07-20

### Bug fixes

- Add repository field to package manifests for npm provenance (#65)

  Fixes an issue that prevented every package from publishing to npm. Each package now links to its source repository from its npm page.

### Dependencies

- Upgrade ESLint packages and migrate to TypeScript 6 (#67)

  Upgrades the toolchain to TypeScript 6 and ESLint 10.

## 0.5.0 — 2026-07-20

### Features

- Add dstructs and statistics packages (#58)

  The toolbelt monorepo gains two more packages: `@williamthorsen/toolbelt.dstructs`, a first-in-first-out queue, and `@williamthorsen/toolbelt.statistics`, normal-distribution and cumulative-sum utilities with no third-party runtime dependency. Both reproduce the API from their earlier GitHub Packages releases and expose it at the candidate subpath (`@williamthorsen/toolbelt.{pkg}/candidate`).

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
