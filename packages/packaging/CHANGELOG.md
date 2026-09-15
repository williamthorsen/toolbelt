# Changelog

All notable changes to this project will be documented in this file.

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
