# Changelog

All notable changes to this project will be documented in this file.

## 0.5.0 — 2026-08-15

### Features

- 🚨 **Breaking:** Promote createTempTree to the candidate tier with a caller-chosen prefix and binary entries (#148)

  Promotes `createTempTree` and `TempTree` to `@williamthorsen/toolbelt.filesystem/candidate`, adding two capabilities as they move: a caller-chosen prefix for the temporary directory's name, and file contents given as bytes. A prefix that would place the tree anywhere but directly inside the system temporary directory is rejected before anything is created.

  Migration: `createTempTree` and `TempTree` are imported from `@williamthorsen/toolbelt.filesystem/candidate` rather than `/proposed`.

- Add `writeAtomic`, an atomic file-write utility (#154)

  Adds `writeAtomic` to `@williamthorsen/toolbelt.filesystem`, exported from the `/proposed` subpath. It stages content in a temp file beside the target and renames over it, so a concurrent reader sees either the previous file or the complete new one.

## 0.4.1 — 2026-08-13

### Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 0.4.0 — 2026-08-12

### Features

- 🚨 **Breaking:** Add reconcileFile to toolbelt.filesystem and promote describeError to release tier (#122)

  Adds `reconcileFile` to `@williamthorsen/toolbelt.filesystem`: an idempotent file write that creates what is missing, refuses by default to replace what is not, and reports which of those it did as a structured outcome rather than throwing.

  Separately, `describeError` is promoted to `@williamthorsen/toolbelt.errors`' release tier, so no release-tier module depends on a candidate one.

  Migration: `describeError` is imported from `@williamthorsen/toolbelt.errors` rather than `@williamthorsen/toolbelt.errors/candidate`, which no longer exports it. `chainError`, `isError`, and `assertIsError` remain at candidate tier.

- Add reconcileFileFromFile to toolbelt.filesystem (#123)

  Adds `reconcileFileFromFile` to `@williamthorsen/toolbelt.filesystem`. It reads a source path as utf8 text and reconciles a destination against it, sharing `reconcileFile`'s options, outcome vocabulary, and `FileReconciliation` result type.

  A source that cannot be read reports `failed` with a reason naming the source and the cause, rather than throwing. Because the outcome depends on the source's content, the read happens even under `isDryRun`, so a dry run can report `failed` where `reconcileFile`'s cannot.

## 0.3.0 — 2026-08-08

### Features

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

### Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

## 0.2.1 — 2026-07-27

### Tooling

- Normalize Vitest, and lint configs

### Documentation

- Change license to ISC

## 0.2.0 — 2026-07-24

### Features

- Add the filesystem package with bounded cascading config discovery (#71)

  Adds a new package, `@williamthorsen/toolbelt.filesystem`, and its first functions: `findProjectRoot`, which locates a project's root directory, and `loadConfigCascade`, which loads the configuration files layered across the directories between a starting point and that root.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
