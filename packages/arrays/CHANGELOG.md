# Changelog

All notable changes to this project will be documented in this file.

## 6.3.0 — 2026-09-15

### 🎉 Features

- Add a ReadyUp adoption kit reporting hand-rolled guards (#311)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.guards` that reports every function whose entire body re-implements a guard published by the package.

- Add a ReadyUp adoption kit to toolbelt.filesystem (#316)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.filesystem` that recommends `writeAtomic` where a project writes a file to a temporary path and renames it into place, and `listDirectoryChain`, `findDirectoryChainMatch`, or `listDirectoryChainMatches` where a loop ascends to the filesystem root by `path.dirname`.
  - Promotes `writeAtomic` to the candidate tier.

  Migration: Change any import of `writeAtomic` from `@williamthorsen/toolbelt.filesystem/proposed` to `@williamthorsen/toolbelt.filesystem/candidate`.

- Read a directory walk's probed name through a binding or constant (#324)

  - Extends the ReadyUp adoption kit in `@williamthorsen/toolbelt.packaging` to recommend `findPackageRoot` or `resolveSelfVersion` for a hand-rolled `package.json` search that checks for the file through a variable declared once inside its loop and never reassigned there, or through a string constant declared once in the same file.
  - Stops the kit in `@williamthorsen/toolbelt.filesystem` from reporting such a search, which it previously treated as a generic directory walk.

- Report hand-rolled dedents in the strings adoption kit (#330)

  - Adds `no-joined-line-array`, which reports an array of string or template literals that spans several lines and is joined with a newline.
  - Adds `no-layout-breaking-template`, which reports an untagged template literal whose later lines drop below the indentation of the line on which it opens.

### 🐛 Bug fixes

- Stop reading each segment of a probe's path as a separately probed name (#320)

  - Fixes an issue in which `toolbelt.filesystem`'s ReadyUp adoption kit treated a loop over parent directories as a search for each directory's own `package.json` when the path checked at each level contained a `'package.json'` literal, as in `path.join(dir, 'node_modules', name, 'package.json')`, and so did not report the loop under `no-hand-rolled-directory-walk`.

- Make pickInteger draw once per call and keep seeded draws below 1 (#329)

  - Fixes seeded draws that could return exactly 1, outside the documented range of [0, 1): With seed `1_000_000_856_026_238`, `pickInteger({ min: 0, max: 9, seed })` returned 10 and `pickItem` from `toolbelt.arrays` threw a `RangeError`.
  - Changes only the draw that returned 1, which no `SeededRng` and no integer seed below 2³¹ could produce.
  - Stops `pickInteger` from skipping its draw when `min` and `max` truncate to the same integer, which changes no return value but shifts the later values drawn from a `SeededRng` or seed function passed with such bounds.

### ♻️ Refactoring

- Move directory-walk recognition from filesystem into packages/adoption (#318)

  - Adds `listDirectoryAscents` to `packages/adoption`, which reports each directory ascent once with the names probed by its innermost loop, and reduces `filesystem`'s `listChainWalkSites` to a partition of that output, so a `toolbelt.packaging` kit can partition the same ascents without its own copy of the recognition.
  - Renames the hand-off rule `isProjectRootSearch` to `isManifestSearch` and rewrites the text in `packages/adoption` and `filesystem` that credited `findProjectRoot` alone with a `package.json` walk.
  - Stops `filesystem`'s kit from reporting a loop that ascends one binding around an inner loop ascending another binding and probing for `package.json`, which is the only finding changed by the move.

### 🧪 Tests

- Move the rdy run report reader into the adoption test utilities (#323)

  - Replaces the `rdy run --json` report reader copied into each of the twelve `pragma-suppression.tool.test.ts` suites with `listKitCheckReports`, a helper added to `@williamthorsen/toolbelt.adoption/test-utils` that runs a package's compiled kit over a fixture repo and returns its check reports, so a change to the shape of readyup's report needs one edit rather than twelve.
  - Fixes the error thrown for a kit that does not load: Each copy discarded the load error recorded by `rdy` on the kit's entry and threw "the run reported no adoption checks", and the helper throws with `rdy`'s own message instead.

### ⚙️ Tooling

- Remove the stale repo-local cliff.toml and normalize changelog titles (#327)

  - Stops `release-kit prepare` from printing a "skipped due to grouping error(s)" warning for each releasable workspace by letting it resolve the git-cliff template bundled with release-kit, previously overridden by the root `cliff.toml`.
  - Excludes commits without a ticket prefix from future changelog entries.
  - Renames the section titles in every `packages/*/.meta/changelog.json`, except `Dependency updates`, to the headings of release-kit's work-type taxonomy, such as "🎉 Features" and "🏗️ Internal features", and regenerates each `CHANGELOG.md` so that release-kit orders existing and new sections by the same rule.
  - Causes the next `release-kit prepare` to plan patch releases of `dstructs`, `hof`, and `sets`, which had no other commits since their last release, because the changelog commit touches every workspace.

### 📚 Documentation

- Align prose with plain-speech doctrine and writing conventions (#306)

  - Copy-edits prose across the repo: comments, test names, package READMEs, and `AGENTS.md`.
  - Rewrites a few user-facing strings as well, among them `configure-project`'s help text and the errors from `parseProjectSpec`, `securityCommands`, and `hashString`.

## 6.2.0 — 2026-09-06

### 🎉 Features

- Add a ReadyUp adoption kit to toolbelt.arrays (#254)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.arrays`. The kit recommends `pickItem` in place of a floored random draw standing in array-subscript position, and `arraify` in place of a ternary wrapping a value in an array. Its third check warns that a `sort` or `toSorted` comparator deciding the order on `Math.random()` alone does not order consistently and should be replaced by `shuffle` or `shuffleInPlace`.

  Separately, fixes an issue where `arraify` treated an array constructed in another realm, such as a `node:vm` context, as a plain value and wrapped it in a new array. It now tests with `Array.isArray`.

- Add a ReadyUp adoption kit reporting hand-rolled sleeps (#303)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.async` that recommends the use of `delay` to replace a hand-rolled sleep.

### 📚 Documentation

- Repair reduced object relatives in passages recurring across files (#262)

  Repairs the reduced object relative in the prose passages that recur across more than one file, in package READMEs, source comments, test titles, and the ReadyUp kits' check messages.

- Repair reduced object relatives in the READMEs and AGENTS.md (#263)

  Repairs the reduced object relative in `AGENTS.md`, the root `README.md`, and the package READMEs.

- Repair reduced object relatives in packages/adoption (#264)

  Repairs the reduced object relative in `packages/adoption`, in source comments, doc descriptions, and test titles.

- Repair reduced object relatives in the readiness modules and kits (#265)

  Repairs the reduced object relative in the six kit-bearing packages' readiness modules and ReadyUp kit sources, across comments, doc descriptions, test titles, and the kits' check messages.

- Repair the repository's prose and record every rejection's ground (#290)

  Applies one repo-wide `revise-prose` sweep across the repository's READMEs, `AGENTS.md`, source comments, doc descriptions, and test names.

## 6.1.0 — 2026-08-30

### 🎉 Features

- Publish identity and object-path functions and remove dead code (#242)

  Adds three functions to the published surface that were in an exportable maturity tier but not actually exported: `identity` from `toolbelt.hof` and `hasKeyAtPath` and `getValueAtPathOrThrow` from `toolbelt.objects`. Tests now fail if a module in an exported tier is not exported from it.

  Also fixes an issue where `@williamthorsen/toolbelt.arrays`, `@williamthorsen/toolbelt.hof`, or `@williamthorsen/toolbelt.objects` bundled dead code.

## 6.0.2 — 2026-08-28

### Dependency updates

- Bumped `@williamthorsen/toolbelt.numbers` to 7.0.2

## 6.0.1 — 2026-08-24

### Dependency updates

- Bumped `@williamthorsen/toolbelt.numbers` to 7.0.1

## 6.0.0 — 2026-08-21

### 🎉 Features

- 🚨 **Breaking:** Correct the nullish guards' narrowing and rename `isNullable` (#206)

  Fixes an issue where `isNullable` in `@williamthorsen/toolbelt.guards` narrowed both of its branches backwards: A value it confirmed to be null or undefined was typed as non-nullish, so dereferencing it inside the check compiled and then threw. It is now named `isNullish`, after the type it narrows to.

  Separately, `isNonNullable` and `assertIsNonNullable` let an explicit type argument exclude `null` from the false branch while `null` still reached it at runtime. Both now take the value at its own type.

  Migration: `isNullable` no longer exists, and `isNullish` narrows in the opposite direction, so a call site written against the old behavior now fails to compile. On `isNonNullable` and `assertIsNonNullable`, an explicit type argument narrower than the value's own type is now a compile error; inference-driven narrowing is unchanged, as is `filter(isNonNullable)`.

## 5.0.1 — 2026-08-16

### 🧪 Tests

- Drop expect-type in favor of expectTypeOf (#175)

  Replaces all imports of `expectTypeOf` from `expect-type` with the same import from `vitest`. Previously there had been imports from both libraries. `expect-type` is removed as a dependency.

## 5.0.0 — 2026-08-15

### 🎉 Features

- 🚨 **Breaking:** Fix unsound narrowing in `getAtIndexOrThrow` and rename it to `getItemAtIndexOrThrow` (#152)

  Fixes an issue where `getAtIndexOrThrow` could falsely treat an `undefined` return value as satisfying a return type that excluded `undefined`. The function now throws a `RangeError` if the array holds no item at the index and a `TypeError` if the index is not a safe integer. `undefined` is a valid return value if the input array's type allows `undefined` elements. The function is renamed `getItemAtIndexOrThrow`.

  Separately, `findOrThrow` now decides a match by its predicate rather than by the value it found, so an element is not treated as not found merely because it is falsy. Its return type is now `T` rather than `NonNullable<T>`.

  Migration: Consumers of `@williamthorsen/toolbelt.arrays/candidate` import `getItemAtIndexOrThrow` in place of `getAtIndexOrThrow`.

- 🚨 **Breaking:** Rename `findOrThrow` to `findItemOrThrow` and document it (#153)

  Renames `findOrThrow` to `findItemOrThrow` in `@williamthorsen/toolbelt.arrays` for consistency with repo naming conventions.

  Migration: Consumers import `findItemOrThrow` from `@williamthorsen/toolbelt.arrays/candidate`. The signature and behavior are unchanged.

## 4.0.1 — 2026-08-13

### ⚙️ Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 4.0.0 — 2026-08-12

### 🎉 Features

- 🚨 **Breaking:** Rename get* functions by return kind and verb specificity (#119)

  Renames thirteen functions across various packages to align with a consistent naming pattern.

### ♻️ Refactoring

- Align stray modules with layout and TypeScript conventions (#118)

  Aligns all packages with code-layout and annotation conventions, ending a handful of long-standing exceptions. Documentation has been updated to make the conventions clear.

## 3.4.0 — 2026-08-08

### ♻️ Refactoring

- Fix slug punctuation and require safe integers (#86)

  - Fixes an issue where the use of certain letters as the slug separator in `slugify` would leave punctuation marks in the result.
  - Time-unit conversions, scaling range bounds, normal-distribution interval counts, and array indices in object paths now reject values too large to represent exactly instead of silently losing precision.
  - Seeded number generators now produce distinct sequences for seeds at or beyond 2^53, where adjacent seeds previously collapsed onto nearly identical output. A seed of that size saved before this release no longer reproduces the same output.

### ⚙️ Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Adopt the centralized tsconfig with more modern settings (#81)

  Raises the language level for typechecking to ES2025, so code across the monorepo can now use `Promise.try`, `RegExp.escape`, the new `Set` methods, and iterator helpers. Typechecking is also stricter: properties reached through an index signature must now be read with bracket access. Published output is unchanged.

- Adopt four deferred unicorn lint rules (#90)

  The strict-lint severity cap of four lint rules has been raised to error: `no-array-from-fill`, `no-return-array-push`, `no-unreadable-array-destructuring`, and `prefer-math-constants`.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

## 3.3.9 — 2026-07-27

### ⚙️ Tooling

- Normalize Vitest, and lint configs

### 📚 Documentation

- Change license to ISC

## 3.3.8 — 2026-07-24

### ⚙️ Tooling

- Configure release-kit & repo labels

## 3.3.7 — 2026-07-20

### 🐛 Bug fixes

- Add repository field to package manifests for npm provenance (#65)

  Fixes an issue that prevented every package from publishing to npm. Each package now links to its source repository from its npm page.

### 📦 Dependencies

- Upgrade ESLint packages and migrate to TypeScript 6 (#67)

  Upgrades the toolchain to TypeScript 6 and ESLint 10.

## 3.3.6 — 2026-07-20

### ⚙️ Tooling

- Migrate to the nmr toolchain and resolve dependency vulnerabilities (#45)

  Every monorepo task (build, test, lint, and audit) now runs through the shared `nmr` toolchain instead of the repository's previous hand-rolled scripts, bringing it into line with other repositories.

## 3.3.5 — 2026-03-19

### 🎨 Formatting

- Format changelogs

## 3.3.2 — 2026-03-10

### 📦 Dependencies

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
