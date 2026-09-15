# Changelog

All notable changes to this project will be documented in this file.

## 0.10.0 — 2026-09-15

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

### 🐛 Bug fixes

- Stop reading each segment of a probe's path as a separately probed name (#320)

  - Fixes an issue in which `toolbelt.filesystem`'s ReadyUp adoption kit treated a loop over parent directories as a search for each directory's own `package.json` when the path checked at each level contained a `'package.json'` literal, as in `path.join(dir, 'node_modules', name, 'package.json')`, and so did not report the loop under `no-hand-rolled-directory-walk`.

### ♻️ Refactoring

- Move directory-walk recognition from filesystem into packages/adoption (#318)

  - Adds `listDirectoryAscents` to `packages/adoption`, which reports each directory ascent once with the names probed by its innermost loop, and reduces `filesystem`'s `listChainWalkSites` to a partition of that output, so a `toolbelt.packaging` kit can partition the same ascents without its own copy of the recognition.
  - Renames the hand-off rule `isProjectRootSearch` to `isManifestSearch` and rewrites the text in `packages/adoption` and `filesystem` that credited `findProjectRoot` alone with a `package.json` walk.
  - Stops `filesystem`'s kit from reporting a loop that ascends one binding around an inner loop ascending another binding and probing for `package.json`, which is the only finding changed by the move.

### 🧪 Tests

- Add end-to-end tests for the errors and vitest adoption kits (#310)

  - Adds a `pragma-suppression.tool.test.ts` to each adoption kit, running the compiled kit bundle through `rdy run --json`, the only path that reaches the shipped bundle and the runner's `rdy-ignore` handling.
  - Exports `pointCwdAt` from `@williamthorsen/toolbelt.adoption/test-utils`, so that the `errors` kit test can point `process.cwd()` at a fixture repo without a devDep on `@williamthorsen/toolbelt.testing`, which would close a dependency cycle.

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

## 0.9.0 — 2026-09-06

### 🎉 Features

- Add a ReadyUp adoption kit (#253)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.objects`. The kit recommends `Object.hasOwn` or the package's own `hasOwnProperty` in place of a call reached through `Object.prototype`, and `isRecord` or `isRecordOrArray` in place of a guard written as `typeof value === 'object' && value !== null`. Its third check warns that a comparison of two `JSON.stringify` calls is key-order dependent and should be replaced by `isEqual`.

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

## 0.8.0 — 2026-08-30

### 🎉 Features

- Report hand-rolled test-scoped disposal in the adoption kit (#244)

  Adds `no-hand-rolled-test-disposal` to the ReadyUp kit that ships with `@williamthorsen/toolbelt.vitest`. The check flags an `onTestFinished` callback that disposes a value and recommends `disposeOnTestFinished` in its place, at `recommend` severity alongside the kit's existing `process.exit` and console checks.

  Only a callback that visibly calls `[Symbol.dispose]()` is flagged.

### 🐛 Bug fixes

- Reject a check declaring a kind its detector never produces (#246)

  Fixes an issue where an adoption check could declare a kind its kit's detector never produces. `Kind` was inferred from `checks` and `detect` together, so a typo in a check's `kinds` widened `Kind` rather than failing.

## 0.7.0 — 2026-08-28

### 🎉 Features

- Report hand-rolled console reads in the adoption kit (#227)

  Adds four console checks to `@williamthorsen/toolbelt.vitest`'s ReadyUp kit, checking for hand-rolled code to capture, silence, or read console output. The kit warns where a capture silently drops arguments, and recommends `silenceConsole` and `listConsoleLines` in place of hand-rolled code.

## 0.6.0 — 2026-08-24

### 🎉 Features

- Add listConsoleLines to toolbelt.vitest (#226)

  Adds `listConsoleLines` to `@williamthorsen/toolbelt.vitest/candidate`, which returns the lines a spied console method received, one string per call. It reads the spy rather than installing one of its own, so it composes with `silenceConsole` instead of competing for the same slot.

## 0.5.1 — 2026-08-24

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

### 📚 Documentation

- Document the `aroundEach`/`aroundAll` pairing in `makeFixture`'s guidance (#209)

  Adds a section to `@williamthorsen/toolbelt.vitest`'s `README.md`, documenting the Vitest hooks that pair with `makeFixture` for a resource installed around a test.

## 0.5.0 — 2026-08-21

### 🎉 Features

- Add a ReadyUp adoption kit to `numbers` (#188)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.numbers`. When run against a project, the kit identifies hand-rolled code that can be replaced by the package's `clamp`, `round`, or `pickInteger` functions.

### 🐛 Bug fixes

- Blank comments and literals before a detector reads a source (#191)

  Fixes the issue that the `errors`, `numbers`, and `vitest` adoption kits' detectors did not distinguish code from comments and literals, and so flagged a pattern written in a comment or a string as a candidate replacement site. Each detector now blanks every comment, string, template literal, and regular expression before its anchor scan, leaving interpolated expressions intact.

### 🏗️ Internal features

- Add `packages/adoption` and migrate the `errors` and `vitest` kits onto it (#183)

  Adds `packages/adoption`, a private workspace package holding the source-scanning primitives, path predicates, and kit assembler that the toolbelt packages' ReadyUp adoption kits share, and migrates the `errors` and `vitest` kits onto it. Each kit is now a detector and a declaration; the sweep, the adoption count, and the finding report come from `readyup/check-utils` through `defineAdoptionKit`, the one module that binds to it.

  Adds `__tests__/kit-bundle-freshness.tool.test.ts`, which fails CI when a committed kit bundle falls behind a source it inlines.

## 0.4.0 — 2026-08-16

### 🎉 Features

- Add `disposeOnTestFinished` for a `Disposable` built inside a test (#180)

  Adds `disposeOnTestFinished` to `@williamthorsen/toolbelt.vitest/candidate`. The new function registers a `Disposable`'s disposal with the running test and returns the resource. A builder taking per-call arguments can wrap its construction in place and hand back a value derived from the resource, leaving the call site with no lifetime code. `makeFixture` remains the function to use for a resource that outlives one test.

## 0.3.0 — 2026-08-15

### 🎉 Features

- Add makeFixture for Disposable-valued Vitest fixtures (#149)

  Adds `makeFixture` to `@williamthorsen/toolbelt.vitest` at the candidate tier. It adapts a `Disposable` factory into a Vitest `test.extend` fixture that disposes the value when its scope ends, avoiding the need for a mutable top-level binding, a guard, and a hand-written `onCleanup` call. `createTempTree`, `captureStdio`, and `silenceConsole` each compose with it.

- Add throwOnProcessExit and a ReadyUp kit reporting hand-rolled exit mocks (#150)

  Adds `throwOnProcessExit` to `@williamthorsen/toolbelt.vitest`'s candidate tier: a `Disposable` that replaces `process.exit` for a scope with an implementation throwing a `ProcessExitError` carrying the exit code, and that exposes the spy for asserting a path did not exit. It always throws, because a mock that returns lets a test assert against a path the process never reaches, with nothing reporting it.

  Separately, the package ships a ReadyUp kit that reports every use of `vi.spyOn(process, 'exit')` in a consuming project's test files, recommending substitution and identifying defects in `process.exit` mocks.

## 0.2.0 — 2026-08-13

### 🎉 Features

- Scaffold toolbelt.vitest for Vitest testing utilities (#125)

  Adds `@williamthorsen/toolbelt.vitest`, a package for testing utilities that depend on Vitest. It carries no exports yet.

  Vitest is declared as a `peerDependency` at `^4.0.0`. It is the repo's only peer dependency.

- Add silenceConsole to toolbelt.vitest (#126)

  Adds `silenceConsole`, the first export of `@williamthorsen/toolbelt.vitest`, reachable at the `/candidate` subpath. It silences the named console methods for the enclosing scope and hands back the Vitest spy behind each one, restoring them all when the scope exits; called with no argument it silences all five (`debug`, `error`, `info`, `log`, and `warn`).

### ⚙️ Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
