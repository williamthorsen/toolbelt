# Changelog

All notable changes to this project will be documented in this file.

## 0.9.0 — 2026-09-15

### 🎉 Features

- 🚨 **Breaking:** Move createTempTree from toolbelt.filesystem to toolbelt.testing (#313)

  - Moves `CreateTempTreeOptions` and the `TempTree` handle to `@williamthorsen/toolbelt.testing/candidate` along with `createTempTree`.

  Migration: Import `createTempTree`, `CreateTempTreeOptions`, and `TempTree` from `@williamthorsen/toolbelt.testing/candidate`, and declare `@williamthorsen/toolbelt.testing` in the manifest that declared `@williamthorsen/toolbelt.filesystem` for them.

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

### 📚 Documentation

- Align prose with plain-speech doctrine and writing conventions (#306)

  - Copy-edits prose across the repo: comments, test names, package READMEs, and `AGENTS.md`.
  - Rewrites a few user-facing strings as well, among them `configure-project`'s help text and the errors from `parseProjectSpec`, `securityCommands`, and `hashString`.

## 0.8.3 — 2026-09-06

### 📚 Documentation

- Repair reduced object relatives in passages recurring across files (#262)

  Repairs the reduced object relative in the prose passages that recur across more than one file, in package READMEs, source comments, test titles, and the ReadyUp kits' check messages.

- Repair reduced object relatives in the READMEs and AGENTS.md (#263)

  Repairs the reduced object relative in `AGENTS.md`, the root `README.md`, and the package READMEs.

- Repair reduced object relatives in packages/adoption (#264)

  Repairs the reduced object relative in `packages/adoption`, in source comments, doc descriptions, and test titles.

- Repair the repository's prose and record every rejection's ground (#290)

  Applies one repo-wide `revise-prose` sweep across the repository's READMEs, `AGENTS.md`, source comments, doc descriptions, and test names.

## 0.8.2 — 2026-08-30

### Dependency updates

- Bumped `@williamthorsen/toolbelt.errors` to 0.6.3

## 0.8.1 — 2026-08-28

### ♻️ Refactoring

- Upgrade eslint-config-typescript to v12.0.1 and satisfy its new rules (#236)

  Upgrades `@williamthorsen/eslint-config-typescript` to v12 and fixes violations surfaced by the new rules banning unpublished barrels and floating disposables.

## 0.8.0 — 2026-08-24

### 🎉 Features

- Add a recursive listFiles to createTempTree's entry API (#212)

  Adds `listFiles` to the handle `createTempTree` returns in `@williamthorsen/toolbelt.filesystem/candidate`. It reports every file below a tree-relative directory, at any depth, as sorted `/`-separated paths relative to that directory, whereas `list` reaches one level and reports names alone. A symlink below that directory is neither named nor descended, so every path in the result names a file held inside the tree.

## 0.7.0 — 2026-08-21

### 🎉 Features

- 🚨 **Breaking:** Fix createTempTree's symlink guard and disposal, and complete its entry API (#207)

  Fixes an issue where `TempTree.symlink` in `@williamthorsen/toolbelt.filesystem/candidate` refused a target outside the tree and rewrote a relative target to an absolute path inside it. The containment check now applies to the link path alone and the target is stored as given, so a link reads back as the string that was passed.

  Separately, fixes an issue where disposing a `TempTree` left the tree on disk when one of its directories had been made read-only.

  Adds six methods to `TempTree`. `writeAll` applies the constructor's map of entries to a tree already built; `exists`, `list`, `read`, `readJson`, and `rm` read the tree back and remove from it, so a suite scaffolding through the handle reads its own fixture through it rather than reaching for `node:fs`.

  Migration: A caller relying on the previous absolute storage passes `tree.resolve(target)`, which is written unchanged.

## 0.6.0 — 2026-08-16

### 🎉 Features

- Add mkdir, symlink, write, and writeJson methods to `TempTree` (#176)

  Adds four write methods to `TempTree` in `@williamthorsen/toolbelt.filesystem`: `mkdir`, `symlink`, `write`, and `writeJson`. Each takes a tree-relative path, creates the parent directories it needs, resolves through the same containment check `resolve` applies, and returns the absolute path, so a suite writing into a built temporary tree reaches it through the handle rather than through `node:fs`. `symlink` accepts a link path and a target, and picks the link type from the target.

### 🧪 Tests

- Drop expect-type in favor of expectTypeOf (#175)

  Replaces all imports of `expectTypeOf` from `expect-type` with the same import from `vitest`. Previously there had been imports from both libraries. `expect-type` is removed as a dependency.

## 0.5.0 — 2026-08-15

### 🎉 Features

- 🚨 **Breaking:** Promote createTempTree to the candidate tier with a caller-chosen prefix and binary entries (#148)

  Promotes `createTempTree` and `TempTree` to `@williamthorsen/toolbelt.filesystem/candidate`, adding two capabilities as they move: a caller-chosen prefix for the temporary directory's name, and file contents given as bytes. A prefix that would place the tree anywhere but directly inside the system temporary directory is rejected before anything is created.

  Migration: `createTempTree` and `TempTree` are imported from `@williamthorsen/toolbelt.filesystem/candidate` rather than `/proposed`.

- Add `writeAtomic`, an atomic file-write utility (#154)

  Adds `writeAtomic` to `@williamthorsen/toolbelt.filesystem`, exported from the `/proposed` subpath. It stages content in a temp file beside the target and renames over it, so a concurrent reader sees either the previous file or the complete new one.

## 0.4.1 — 2026-08-13

### ⚙️ Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 0.4.0 — 2026-08-12

### 🎉 Features

- 🚨 **Breaking:** Add reconcileFile to toolbelt.filesystem and promote describeError to release tier (#122)

  Adds `reconcileFile` to `@williamthorsen/toolbelt.filesystem`: an idempotent file write that creates what is missing, refuses by default to replace what is not, and reports which of those it did as a structured outcome rather than throwing.

  Separately, `describeError` is promoted to `@williamthorsen/toolbelt.errors`' release tier, so no release-tier module depends on a candidate one.

  Migration: `describeError` is imported from `@williamthorsen/toolbelt.errors` rather than `@williamthorsen/toolbelt.errors/candidate`, which no longer exports it. `chainError`, `isError`, and `assertIsError` remain at candidate tier.

- Add reconcileFileFromFile to toolbelt.filesystem (#123)

  Adds `reconcileFileFromFile` to `@williamthorsen/toolbelt.filesystem`. It reads a source path as utf8 text and reconciles a destination against it, sharing `reconcileFile`'s options, outcome vocabulary, and `FileReconciliation` result type.

  A source that cannot be read reports `failed` with a reason naming the source and the cause, rather than throwing. Because the outcome depends on the source's content, the read happens even under `isDryRun`, so a dry run can report `failed` where `reconcileFile`'s cannot.

## 0.3.0 — 2026-08-08

### 🎉 Features

- Migrate replaceFileExtension into filesystem package (#74)

  Adds `replaceFileExtension` to the filesystem utilities. The function replaces the file extension in a file path; unlike analogous built-in functions, it supports multi-part extensions such as `.d.ts`.

- Add directory-chain ascent and lookup exports (#102)

  Adds three functions for upward directory search, which walk from a starting directory to either the filesystem root or a bounded ceiling, finding named files or directories at each level along the way:

  - `listDirectoryChain` returns the directories alone
  - `listDirectoryChainMatches` returns every level's match
  - `findDirectoryChainMatch` finds only the nearest match

  All three reject a path that falls outside the range they were asked to search. `findProjectRoot` now applies that same rule to its markers.

- Add createTempTree with scope-bound disposal (#106)

  Adds `createTempTree` to `@williamthorsen/toolbelt.filesystem/proposed`. The new function allows a caller to describe a directory tree as a plain object mapping paths to contents and receive a handle in return; the tree is removed when that handle goes out of scope.

- 🚨 **Breaking:** Add findPackageRoot, getSelfVersion, and findProjectRoot to toolbelt.packaging (#107)

  Adds a way for any module, whether it runs from a source tree or a compiled build, to identify the package that owns it and the version that package declares.

  `findProjectRoot` moves from `@williamthorsen/toolbelt.filesystem` to `@williamthorsen/toolbelt.packaging`. Callers of `loadConfigCascade` must now state where its upward search stops, rather than relying on a project root the function found for them.

### ⚙️ Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

## 0.2.1 — 2026-07-27

### ⚙️ Tooling

- Normalize Vitest, and lint configs

### 📚 Documentation

- Change license to ISC

## 0.2.0 — 2026-07-24

### 🎉 Features

- Add the filesystem package with bounded cascading config discovery (#71)

  Adds a new package, `@williamthorsen/toolbelt.filesystem`, and its first functions: `findProjectRoot`, which locates a project's root directory, and `loadConfigCascade`, which loads the configuration files layered across the directories between a starting point and that root.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
