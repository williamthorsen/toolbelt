# Changelog

All notable changes to this project will be documented in this file.

## 0.6.0 — 2026-09-15

### 🎉 Features

- Add a ReadyUp adoption kit reporting hand-rolled error captures (#308)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.testing` that recommends `captureError` in place of a thrown value captured by hand into a variable declared outside a try block.

- Add a ReadyUp adoption kit reporting hand-rolled guards (#311)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.guards` that reports every function whose entire body re-implements a guard published by the package.

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

- Report hand-rolled stdio capture in the testing adoption kit (#331)

  - Extends the ReadyUp adoption kit in `@williamthorsen/toolbelt.testing` with a `no-hand-rolled-stdio-capture` check that recommends `captureStdio` in place of each `vi.spyOn(process.stdout, 'write')` or `vi.spyOn(process.stderr, 'write')`.

### 🐛 Bug fixes

- Stop reading each segment of a probe's path as a separately probed name (#320)

  - Fixes an issue in which `toolbelt.filesystem`'s ReadyUp adoption kit treated a loop over parent directories as a search for each directory's own `package.json` when the path checked at each level contained a `'package.json'` literal, as in `path.join(dir, 'node_modules', name, 'package.json')`, and so did not report the loop under `no-hand-rolled-directory-walk`.

- Decline a capture site asserted toBe a non-Error literal (#325)

  - Stops the ReadyUp kit shipped by `@williamthorsen/toolbelt.testing` from reporting a `try`/`catch` that stores the thrown value as a candidate for `captureError` when the test asserts that value `toBe` a literal, inline or through a `const`, since such a value is not an `Error` and `captureError` fails the test on a non-`Error`.

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

## 0.5.1 — 2026-09-06

### 📚 Documentation

- Repair reduced object relatives in passages recurring across files (#262)

  Repairs the reduced object relative in the prose passages that recur across more than one file, in package READMEs, source comments, test titles, and the ReadyUp kits' check messages.

- Repair reduced object relatives in the READMEs and AGENTS.md (#263)

  Repairs the reduced object relative in `AGENTS.md`, the root `README.md`, and the package READMEs.

- Repair the repository's prose and record every rejection's ground (#290)

  Applies one repo-wide `revise-prose` sweep across the repository's READMEs, `AGENTS.md`, source comments, doc descriptions, and test names.

## 0.5.0 — 2026-08-28

### 🎉 Features

- Report hand-rolled console reads in the adoption kit (#227)

  Adds four console checks to `@williamthorsen/toolbelt.vitest`'s ReadyUp kit, checking for hand-rolled code to capture, silence, or read console output. The kit warns where a capture silently drops arguments, and recommends `silenceConsole` and `listConsoleLines` in place of hand-rolled code.

## 0.4.0 — 2026-08-24

### 🎉 Features

- Add `pointArgvAt`, a scope-bound argv pointer (#219)

  Adds `pointArgvAt` to `@williamthorsen/toolbelt.testing/candidate`. The function is a `Disposable` that points `process.argv` at a set of CLI arguments for the enclosing scope and restores the previous value when the scope exits.

## 0.3.0 — 2026-08-16

### 🎉 Features

- Add `pointCwdAt`, a scope-bound cwd pointer (#178)

  Adds `pointCwdAt` to `@williamthorsen/toolbelt.testing/candidate`, a `Disposable` that points `process.cwd()` at a directory for the enclosing scope and restores the prior state when the scope exits.

  Restoration is by saved value rather than by spy, so scopes nest in any combination and neither `restoreMocks: true` nor a stray `vi.restoreAllMocks()` can point a suite back at the real working directory.

## 0.2.0 — 2026-08-13

### 🎉 Features

- Add toolbelt.testing for runner-agnostic test utilities (#136)

  Adds `@williamthorsen/toolbelt.testing` for test-only utilities that need no test-runner API. The new package is scaffolded for future use and currently exports nothing.

- Add captureStdio for capturing terminal output (#138)

  Adds `captureStdio`, a utility function for capturing terminal output, to `@williamthorsen/toolbelt.testing` at the candidate stage. The function buffers everything written to `process.stdout` and `process.stderr` for the enclosing scope and restores both streams when it exits.

- Add captureError for capturing and narrowing thrown errors (#141)

  Adds `captureError` to `@williamthorsen/toolbelt.testing`'s candidate tier. It runs a call expected to fail and returns the error it threw or rejected with, narrowed to the expected class.

### ⚙️ Tooling

- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
