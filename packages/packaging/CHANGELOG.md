# Changelog

All notable changes to this project will be documented in this file.

## 0.7.3 — 2026-11-12

### ♻️ Refactoring

- Move the top-level comma splitter into adoption (#551)

  Adds `listTopLevelSpans` to `packages/adoption`, which splits a range of text at its top-level commas and returns each item as a `TextSpan` of offsets into the text, and builds `listTopLevelArguments` and the `strings` kit's `listElementSpans` on it in place of the bracket-depth loop that each kept.

## 0.7.2 — 2026-11-12

### 🐛 Bug fixes

- Share one function-literal reader across the readiness kits (#470)

  Fixes the issue that the biased-shuffle check in the `@williamthorsen/toolbelt.arrays` ReadyUp kit missed an inline `function` comparator whose parameter list contains braces, such as `function (a: { n: number }, b: { n: number }) { return Math.random() - 0.5; }`. The change moves the function-literal parsing of the `arrays`, `async`, and `vitest` kits into one shared reader in `adoption`, which finds a `function` expression's body past the braces in its parameter list.

- Claim a trailing-comma setTimeout as a hand-rolled sleep (#487)

  Fixes the issue that the `@williamthorsen/toolbelt.async` ReadyUp kit did not report a hand-rolled sleep whose `setTimeout` call ends in a trailing comma, such as `setTimeout(resolve, 50,)`, as a candidate for `delay`. Replaces the two private copies of the argument splitter, which disagreed on the trailing comma, with one splitter in `packages/adoption` that the async and numbers kits both import.

### 🧪 Tests

- Adds `createKitFixture`, which creates a tracked repo, points `process.cwd()` at it, and lists a kit's checks imported afresh, and `runEveryCheck`, which returns every check's report in order, to `@williamthorsen/toolbelt.adoption/test-utils`, and rewrites the kit tests in `src/readiness/__tests__/kit.tool.test.ts` to replace the repeated `createTrackedRepo`, `pointCwdAt`, and `listFreshKitChecks` calls with them. (#469)

### 📦 Dependencies

- Upgrades the catalog's `readyup` from 0.45.1 to 0.46.0 and recompiles each package's `.readyup/kits/default.js` and `.readyup/manifest.json`, because the bundled check utilities changed: `readFile` no longer throws `EISDIR` for a directory path. (#537)

## 0.7.1 — 2026-11-09

### ♻️ Refactoring

- Split the path-expression reader out of listDirectoryAscents (#437)

  Moves the path-expression reader out of `packages/adoption/src/portable/listDirectoryAscents.ts` into its own module, `readPathParts.ts`, adds unit tests for it, and changes it to take each template literal from `listTemplateLiterals` instead of walking templates itself. Recompiles the committed kit bundles to match.

- Bring adoption's kit and ascent modules to the declaration-order and naming rules (#438)

  Reorders the declarations in four `packages/adoption` files to follow the declaration-order rule, which puts the exported logic first and the helpers after it, and makes small naming and structure cleanups in the same files.

### 🧪 Tests

- Replaces each kit test's local copy of the checklist helper with `listKitChecks` from `@williamthorsen/toolbelt.adoption/test-utils`, which throws when the kit's first checklist is missing or staged rather than return an empty list against which an assertion over every check passes. (#434)
- Replaces the copied `listSweptFiles` helper and `JS_TS_EXTENSION` regex in every `self-sweep.unit.test.ts` with `listJsTsSources` from `@williamthorsen/toolbelt.adoption/test-utils`, which lists the files directly inside each given directory that adoption's `isJsTsSource` accepts. (#435)
- Adds `listFreshKitChecks` to `@williamthorsen/toolbelt.adoption/test-utils` and moves every kit test onto it from its own copy of `loadChecks`, which reset Vitest's module registry to obtain a kit that had not yet swept a fixture repo. (#452)
- Deletes the "neither reports nor counts" examples and their `UNCLAIMED` fixtures from the remaining adoption kits' `kit.tool.test.ts`, since the detectors' unit tests already observe each of those declines. (#455)
- Adds `diffAdoptedExports` to `@williamthorsen/toolbelt.adoption/test-utils`, which returns a package's callable exports, the callable exports that `ADOPTED_EXPORTS` omits, and the listed names that the package's tiers don't export, and uses it in place of the hand-written comparison in each package's `adoptedExports.unit.test.ts`. (#458)
- Reduces every adoption kit's `pragma-suppression.tool.test.ts` to its qualified-pragma example, which asserts that the named check drops the site while every other check keeps its count, and deletes the examples that tested readyup's pragma matching rather than the kit. (#459)

## 0.7.0 — 2026-10-25

### 🎉 Features

- Adds the structured changelog `.meta/changelog.json` to each package's npm tarball, beside `CHANGELOG.md`. (#398)

### ♻️ Refactoring

- Replaces hand-rolled error descriptions, `instanceof Error` checks on caught values, record guards, directory ascents, and first-letter capitalization in package source with `describeError`, `isError`, `isRecord`, `isRecordOrArray`, `listDirectoryChain`, and `capitalize`, and declares each helper's package from another workspace as a `workspace:*` runtime dependency of the package that adopts it. (#400)

### 🧪 Tests

- Rewrites the array-join fixtures and the untagged multi-line template fixtures in the readiness and parser tests as `dedent` templates that render the same text, and declares `@williamthorsen/toolbelt.strings` as a devDependency of each package that now imports `dedent` in its tests. (#401)

## 0.6.4 — 2026-10-24

### 📦 Dependencies

- Upgrade dependencies to latest compatible versions (#391)

  Upgrades Node.js, pnpm, and the repository's dependencies to their latest compatible releases, which clears the three dev advisories that failed `nmr audit`. The upgrade to `@williamthorsen/eslint-config-typescript` 20.1.3 adds unicorn lint rules, and the code is adapted to them in the same change.

## 0.6.3 — 2026-10-09

### 🎉 Features

- Add a ReadyUp kit recommending toolbelt.cli over hand-rolled argument parsing (#367)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.cli` that reports, through `rdy run --packages`, each call to `node:util`'s `parseArgs` and each function that compares arguments against flag names by hand. Includes `bin/` and `src/bin/` in the kit's sweep, which the other toolbelt kits exempt, because a command-line runner usually lives there.

### 📚 Documentation

- Updates each kit README to show `rdy run --sources` and a `sources: ['npm:…']` config example, and states that this spelling needs readyup 0.40.0 or later. (#371)

## 0.6.2 — 2026-10-02

### 📚 Documentation

- Sweep the repository's comments against the comment discipline (#353)

  Sweeps the comments in every authored source file against the comment discipline. The sweep cuts comments that restate the code or narrate history, corrects descriptions that contradicted the code, and adds descriptions to declarations that lacked one. It also tags the exported tier functions and classes that lacked `@category` and `@stage`, and corrects test titles that misstated their tests.

- Revises READMEs, doc comments, and test names across the repository to follow the current `plain-speech` and writing-preference rules. (#354)
- Rewords the help text and messages printed by `tb-jira`, `tb-node`, and `tb-secret`, and the advice and skip reasons reported by the adoption kits, to follow the same writing conventions. (#354)

## 0.6.0 — 2026-09-15

### 🎉 Features

- 🚨 **Breaking:** Move createTempTree from toolbelt.filesystem to toolbelt.testing (#313)

  - Moves `CreateTempTreeOptions` and the `TempTree` handle to `@williamthorsen/toolbelt.testing/candidate` along with `createTempTree`.

  Migration: Import `createTempTree`, `CreateTempTreeOptions`, and `TempTree` from `@williamthorsen/toolbelt.testing/candidate`, and declare `@williamthorsen/toolbelt.testing` in the manifest that declared `@williamthorsen/toolbelt.filesystem` for them.

- Add a ReadyUp adoption kit reporting hand-rolled package.json searches (#322)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.packaging` that recommends `findPackageRoot`, `resolveSelfVersion`, or `findProjectRoot` in place of a hand-rolled loop checking each ancestor directory for `package.json`.

- Read a directory walk's probed name through a binding or constant (#324)

  - Extends the ReadyUp adoption kit in `@williamthorsen/toolbelt.packaging` to recommend `findPackageRoot` or `resolveSelfVersion` for a hand-rolled `package.json` search that checks for the file through a variable declared once inside its loop and never reassigned there, or through a string constant declared once in the same file.
  - Stops the kit in `@williamthorsen/toolbelt.filesystem` from reporting such a search, which it previously treated as a generic directory walk.

- Report hand-rolled dedents in the strings adoption kit (#330)

  - Adds `no-joined-line-array`, which reports an array of string or template literals that spans several lines and is joined with a newline.
  - Adds `no-layout-breaking-template`, which reports an untagged template literal whose later lines drop below the indentation of the line on which it opens.

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

## 0.5.5 — 2026-09-06

### 📚 Documentation

- Repair reduced object relatives in passages recurring across files (#262)

  Repairs the reduced object relative in the prose passages that recur across more than one file, in package READMEs, source comments, test titles, and the ReadyUp kits' check messages.

- Repair reduced object relatives in the READMEs and AGENTS.md (#263)

  Repairs the reduced object relative in `AGENTS.md`, the root `README.md`, and the package READMEs.

- Repair the repository's prose and record every rejection's ground (#290)

  Applies one repo-wide `revise-prose` sweep across the repository's READMEs, `AGENTS.md`, source comments, doc descriptions, and test names.

## 0.5.4 — 2026-08-30

### Dependency updates

- Bumped `@williamthorsen/toolbelt.filesystem` to 0.8.2

## 0.5.3 — 2026-08-28

### Dependency updates

- Bumped `@williamthorsen/toolbelt.filesystem` to 0.8.1

## 0.5.2 — 2026-08-24

### Dependency updates

- Bumped `@williamthorsen/toolbelt.filesystem` to 0.8.0

## 0.5.1 — 2026-08-21

### Dependency updates

- Bumped `@williamthorsen/toolbelt.filesystem` to 0.7.0

## 0.5.0 — 2026-08-16

### 🎉 Features

- Add `pointCwdAt`, a scope-bound cwd pointer (#178)

  Adds `pointCwdAt` to `@williamthorsen/toolbelt.testing/candidate`, a `Disposable` that points `process.cwd()` at a directory for the enclosing scope and restores the prior state when the scope exits.

  Restoration is by saved value rather than by spy, so scopes nest in any combination and neither `restoreMocks: true` nor a stray `vi.restoreAllMocks()` can point a suite back at the real working directory.

## 0.4.0 — 2026-08-15

### 🎉 Features

- 🚨 **Breaking:** Promote createTempTree to the candidate tier with a caller-chosen prefix and binary entries (#148)

  Promotes `createTempTree` and `TempTree` to `@williamthorsen/toolbelt.filesystem/candidate`, adding two capabilities as they move: a caller-chosen prefix for the temporary directory's name, and file contents given as bytes. A prefix that would place the tree anywhere but directly inside the system temporary directory is rejected before anything is created.

  Migration: `createTempTree` and `TempTree` are imported from `@williamthorsen/toolbelt.filesystem/candidate` rather than `/proposed`.

## 0.3.1 — 2026-08-13

### ⚙️ Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 0.3.0 — 2026-08-12

### 🎉 Features

- 🚨 **Breaking:** Rename get* functions by return kind and verb specificity (#119)

  Renames thirteen functions across various packages to align with a consistent naming pattern.

### ♻️ Refactoring

- Align stray modules with layout and TypeScript conventions (#118)

  Aligns all packages with code-layout and annotation conventions, ending a handful of long-standing exceptions. Documentation has been updated to make the conventions clear.

## 0.2.0 — 2026-08-08

### 🎉 Features

- Scaffold toolbelt.packaging for project-layout utilities (#99)

  Adds `@williamthorsen/toolbelt.packaging`, a package scoped to package and project layout: where a package or project boundary begins, and what the manifest at that boundary declares. It exports nothing yet.

- 🚨 **Breaking:** Add findPackageRoot, getSelfVersion, and findProjectRoot to toolbelt.packaging (#107)

  Adds a way for any module, whether it runs from a source tree or a compiled build, to identify the package that owns it and the version that package declares.

  `findProjectRoot` moves from `@williamthorsen/toolbelt.filesystem` to `@williamthorsen/toolbelt.packaging`. Callers of `loadConfigCascade` must now state where its upward search stops, rather than relying on a project root the function found for them.

### ⚙️ Tooling

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
