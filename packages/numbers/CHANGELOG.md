# Changelog

All notable changes to this project will be documented in this file.

## 7.2.0 — 2026-09-15

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

## 7.1.0 — 2026-09-06

### 🎉 Features

- Add a ReadyUp adoption kit (#253)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.objects`. The kit recommends `Object.hasOwn` or the package's own `hasOwnProperty` in place of a call reached through `Object.prototype`, and `isRecord` or `isRecordOrArray` in place of a guard written as `typeof value === 'object' && value !== null`. Its third check warns that a comparison of two `JSON.stringify` calls is key-order dependent and should be replaced by `isEqual`.

- Add a ReadyUp adoption kit reporting hand-rolled sleeps (#303)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.async` that recommends the use of `delay` to replace a hand-rolled sleep.

### 📚 Documentation

- Document the generated-source exemption in the adoption kits (#251)

  Documents the generated- and vendored-source exemption in the `errors`, `numbers`, and `strings` READMEs.

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

## 7.0.3 — 2026-08-30

### 🐛 Bug fixes

- Reject a check declaring a kind its detector never produces (#246)

  Fixes an issue where an adoption check could declare a kind its kit's detector never produces. `Kind` was inferred from `checks` and `detect` together, so a typo in a check's `kinds` widened `Kind` rather than failing.

## 7.0.2 — 2026-08-28

### ♻️ Refactoring

- Upgrade eslint-config-typescript to v12.0.1 and satisfy its new rules (#236)

  Upgrades `@williamthorsen/eslint-config-typescript` to v12 and fixes violations surfaced by the new rules banning unpublished barrels and floating disposables.

## 7.0.1 — 2026-08-24

### 🐛 Bug fixes

- Stop the adoption kits from blanking code after `++`, `!`, and keyword-named members (#208)

  Fixes an issue where the `errors`, `numbers`, and `vitest` adoption kits stopped reading a line's code after a postfix `++`, a non-null `!`, or a property spelled like a keyword. The source blanker each kit runs before its anchor scan read the `/` that followed as the opening of a regular expression and blanked to the line's next `/`, so a replaceable idiom written after one of the three went unreported.

  `@williamthorsen/toolbelt.adoption` now takes `blankNonCode` and `getLineAtOffset` from `readyup/check-utils` in place of the copies it held, which had fallen behind readyup's on those three cases.

### 🏗️ Internal features

- Migrate the adoption kits onto FindingOutcome and add check ids (#217)

  Upgrades `readyup` to 0.32.0 and migrates `defineAdoptionKit` onto the `FindingOutcome` that `buildFindingReport` returns as of 0.31.0.

  Gives every adoption check an `id`, which a consumer's `rdy-ignore` pragma names to suppress that one check; a pragma naming none still silences every check on the line. The kits of `@williamthorsen/toolbelt.errors`, `@williamthorsen/toolbelt.numbers`, and `@williamthorsen/toolbelt.vitest` each declare ids, and `defineAdoptionKit` refuses a kit that gives one id to two checks.

- Hold this repo to its own adoption kits and exempt each package's implementation (#218)

  Removes the exemption that kept this repository out of its own adoption kits. `rdy run --packages` now covers this repo like any other project.

  Each package's own implementation stays exempt, but that exemption now covers the function alone rather than the whole repository.

## 7.0.0 — 2026-08-21

### 🎉 Features

- 🚨 **Breaking:** Promote clamp to the candidate tier with a stricter bounds contract (#185)

  Promotes `clamp` to `@williamthorsen/toolbelt.numbers/candidate` and tightens its bounds contract: A `NaN` bound now throws a `RangeError`, where it previously returned `NaN` silently. A `NaN` value still passes through. Publishes the bounds type as `ClampBounds`, whose optional properties admit `undefined`, so a bound that may be absent typechecks under `exactOptionalPropertyTypes`.

  Migration: `clamp` is no longer exported from the `/draft` subpath; consumers import it from `/candidate`.

- Add a ReadyUp adoption kit to `numbers` (#188)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.numbers`. When run against a project, the kit identifies hand-rolled code that can be replaced by the package's `clamp`, `round`, or `pickInteger` functions.

### 🐛 Bug fixes

- Blank comments and literals before a detector reads a source (#191)

  Fixes the issue that the `errors`, `numbers`, and `vitest` adoption kits' detectors did not distinguish code from comments and literals, and so flagged a pattern written in a comment or a string as a candidate replacement site. Each detector now blanks every comment, string, template literal, and regular expression before its anchor scan, leaving interpolated expressions intact.

### ♻️ Refactoring

- Break the workspace dependency cycle by making `adoption` a leaf (#195)

  Fixes a cyclic dependency among packages in the repo. `packages/adoption` is now a workspace leaf: It declares no workspace dependency, and its test scaffolding is held to node builtins. A new root test fails on any cycle in the workspace dependency graph.

## 6.0.1 — 2026-08-13

### ⚙️ Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 6.0.0 — 2026-08-12

### 🎉 Features

- 🚨 **Breaking:** Rename get* functions by return kind and verb specificity (#119)

  Renames thirteen functions across various packages to align with a consistent naming pattern.

### ♻️ Refactoring

- Stop shipping test-only and dead support modules (#117)

  Fixes an issue where `@williamthorsen/toolbelt.numbers`, `@williamthorsen/toolbelt.objects`, and `@williamthorsen/toolbelt.strings` each shipped a module that was never importable.

- Align stray modules with layout and TypeScript conventions (#118)

  Aligns all packages with code-layout and annotation conventions, ending a handful of long-standing exceptions. Documentation has been updated to make the conventions clear.

## 5.0.0 — 2026-08-08

### 🎉 Features

- 🚨 **Breaking:** Spawn seeded number generator of same subclass (#84)

  A seeded generator spawned from a subclass now matches that subclass, so `IntSeededRng.withSeed` supplies the wrapped function integers where it previously supplied floats. Callers relying on values derived through that path must re-baseline. A detached reference such as `const { withSeed } = SeededRng` now throws.

### ♻️ Refactoring

- Fixes violations surfaced by newly active lint rules (#84)
- Fix slug punctuation and require safe integers (#86)

  - Fixes an issue where the use of certain letters as the slug separator in `slugify` would leave punctuation marks in the result.
  - Time-unit conversions, scaling range bounds, normal-distribution interval counts, and array indices in object paths now reject values too large to represent exactly instead of silently losing precision.
  - Seeded number generators now produce distinct sequences for seeds at or beyond 2^53, where adjacent seeds previously collapsed onto nearly identical output. A seed of that size saved before this release no longer reproduces the same output.

### ⚙️ Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Adopt the mechanical-syntax deferred unicorn rules (#82)

  Promotes ten deferred lint rules from warnings to errors and fixes the issues surfaced by those rules. One published behavior changes as well: Converting a Map to a plain object no longer drops an entry keyed `__proto__`.

- Adopt four deferred unicorn lint rules (#90)

  The strict-lint severity cap of four lint rules has been raised to error: `no-array-from-fill`, `no-return-array-push`, `no-unreadable-array-destructuring`, and `prefer-math-constants`.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

## 4.3.8 — 2026-07-27

### ⚙️ Tooling

- Normalize Vitest, and lint configs

### 📚 Documentation

- Change license to ISC

## 4.3.7 — 2026-07-24

### ⚙️ Tooling

- Configure release-kit & repo labels

## 4.3.6 — 2026-07-20

### 🐛 Bug fixes

- Add repository field to package manifests for npm provenance (#65)

  Fixes an issue that prevented every package from publishing to npm. Each package now links to its source repository from its npm page.

### 📦 Dependencies

- Upgrade ESLint packages and migrate to TypeScript 6 (#67)

  Upgrades the toolchain to TypeScript 6 and ESLint 10.

## 4.3.5 — 2026-07-20

### ⚙️ Tooling

- Migrate to the nmr toolchain and resolve dependency vulnerabilities (#45)

  Every monorepo task (build, test, lint, and audit) now runs through the shared `nmr` toolchain instead of the repository's previous hand-rolled scripts, bringing it into line with other repositories.

## 4.3.4 — 2026-03-19

### 🎨 Formatting

- Format changelogs

## 4.3.1 — 2026-03-10

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
