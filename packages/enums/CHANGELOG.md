# Changelog

All notable changes to this project will be documented in this file.

## 3.2.0 — 2026-09-15

### 🎉 Features

- Add a ReadyUp adoption kit reporting hand-rolled enum membership tests (#315)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.enums` that recommends `isEnumValue` and `toEnumValue` where they should replace hand-rolled code.

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

## 3.1.18 — 2026-09-06

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 6.2.0

## 3.1.17 — 2026-08-30

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 6.1.0

## 3.1.16 — 2026-08-28

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 6.0.2

## 3.1.15 — 2026-08-24

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 6.0.1

## 3.1.14 — 2026-08-21

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 6.0.0

## 3.1.13 — 2026-08-16

### 🧪 Tests

- Drop expect-type in favor of expectTypeOf (#175)

  Replaces all imports of `expectTypeOf` from `expect-type` with the same import from `vitest`. Previously there had been imports from both libraries. `expect-type` is removed as a dependency.

## 3.1.12 — 2026-08-15

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 5.0.0

## 3.1.11 — 2026-08-13

### ⚙️ Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 3.1.10 — 2026-08-12

### Dependency updates

- Bumped `@williamthorsen/toolbelt.arrays` to 4.0.0

## 3.1.9 — 2026-08-08

### ⚙️ Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

## 3.1.8 — 2026-07-27

### ⚙️ Tooling

- Normalize Vitest, and lint configs

### 📚 Documentation

- Change license to ISC

## 3.1.7 — 2026-07-24

### ⚙️ Tooling

- Configure release-kit & repo labels

## 3.1.6 — 2026-07-20

### 🐛 Bug fixes

- Add repository field to package manifests for npm provenance (#65)

  Fixes an issue that prevented every package from publishing to npm. Each package now links to its source repository from its npm page.

### 📦 Dependencies

- Upgrade ESLint packages and migrate to TypeScript 6 (#67)

  Upgrades the toolchain to TypeScript 6 and ESLint 10.

## 3.1.5 — 2026-07-20

### ⚙️ Tooling

- Migrate to the nmr toolchain and resolve dependency vulnerabilities (#45)

  Every monorepo task (build, test, lint, and audit) now runs through the shared `nmr` toolchain instead of the repository's previous hand-rolled scripts, bringing it into line with other repositories.

## 3.1.4 — 2026-03-19

### 🎨 Formatting

- Format changelogs

## 3.1.1 — 2026-03-10

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
