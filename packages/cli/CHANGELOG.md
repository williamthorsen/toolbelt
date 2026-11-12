# Changelog

All notable changes to this project will be documented in this file.

## 0.8.2 — 2026-11-12

### 🐛 Bug fixes

- Share one function-literal reader across the readiness kits (#470)

  Fixes the issue that the biased-shuffle check in the `@williamthorsen/toolbelt.arrays` ReadyUp kit missed an inline `function` comparator whose parameter list contains braces, such as `function (a: { n: number }, b: { n: number }) { return Math.random() - 0.5; }`. The change moves the function-literal parsing of the `arrays`, `async`, and `vitest` kits into one shared reader in `adoption`, which finds a `function` expression's body past the braces in its parameter list.

- Claim a trailing-comma setTimeout as a hand-rolled sleep (#487)

  Fixes the issue that the `@williamthorsen/toolbelt.async` ReadyUp kit did not report a hand-rolled sleep whose `setTimeout` call ends in a trailing comma, such as `setTimeout(resolve, 50,)`, as a candidate for `delay`. Replaces the two private copies of the argument splitter, which disagreed on the trailing comma, with one splitter in `packages/adoption` that the async and numbers kits both import.

### 🧪 Tests

- Adds `createKitFixture`, which creates a tracked repo, points `process.cwd()` at it, and lists a kit's checks imported afresh, and `runEveryCheck`, which returns every check's report in order, to `@williamthorsen/toolbelt.adoption/test-utils`, and rewrites the kit tests in `src/readiness/__tests__/kit.tool.test.ts` to replace the repeated `createTrackedRepo`, `pointCwdAt`, and `listFreshKitChecks` calls with them. (#469)

### 📦 Dependencies

- Upgrades the catalog's `readyup` from 0.45.1 to 0.46.0 and recompiles each package's `.readyup/kits/default.js` and `.readyup/manifest.json`, because the bundled check utilities changed: `readFile` no longer throws `EISDIR` for a directory path. (#537)

## 0.8.1 — 2026-11-09

### ♻️ Refactoring

- Split the path-expression reader out of listDirectoryAscents (#437)

  Moves the path-expression reader out of `packages/adoption/src/portable/listDirectoryAscents.ts` into its own module, `readPathParts.ts`, adds unit tests for it, and changes it to take each template literal from `listTemplateLiterals` instead of walking templates itself. Recompiles the committed kit bundles to match.

- Bring adoption's kit and ascent modules to the declaration-order and naming rules (#438)

  Reorders the declarations in four `packages/adoption` files to follow the declaration-order rule, which puts the exported logic first and the helpers after it, and makes small naming and structure cleanups in the same files.

### 🧪 Tests

- Replaces each kit test's local copy of the checklist helper with `listKitChecks` from `@williamthorsen/toolbelt.adoption/test-utils`, which throws when the kit's first checklist is missing or staged rather than return an empty list against which an assertion over every check passes. (#434)
- Replaces the copied `listSweptFiles` helper and `JS_TS_EXTENSION` regex in every `self-sweep.unit.test.ts` with `listJsTsSources` from `@williamthorsen/toolbelt.adoption/test-utils`, which lists the files directly inside each given directory that adoption's `isJsTsSource` accepts. (#435)
- Adds `listFreshKitChecks` to `@williamthorsen/toolbelt.adoption/test-utils` and moves every kit test onto it from its own copy of `loadChecks`, which reset Vitest's module registry to obtain a kit that had not yet swept a fixture repo. (#452)
- Adds `diffAdoptedExports` to `@williamthorsen/toolbelt.adoption/test-utils`, which returns a package's callable exports, the callable exports that `ADOPTED_EXPORTS` omits, and the listed names that the package's tiers don't export, and uses it in place of the hand-written comparison in each package's `adoptedExports.unit.test.ts`. (#458)
- Reduces every adoption kit's `pragma-suppression.tool.test.ts` to its qualified-pragma example, which asserts that the named check drops the site while every other check keeps its count, and deletes the examples that tested readyup's pragma matching rather than the kit. (#459)

## 0.8.0 — 2026-11-07

### 🎉 Features

- Prefixes each usage error written by `runCli` with the program name from its `name` option, as `<name>: <message>` in place of `Error: <message>`, and leaves the `Did you mean` and `Try '… --help'.` lines that follow it unchanged. (#412)

## 0.7.1 — 2026-10-31

### ♻️ Refactoring

- Replaces the private `findClosestCommand` in `@williamthorsen/toolbelt.cli` with `findCloseMatch`, which moves `@williamthorsen/toolbelt.strings` from the package's `devDependencies` to its `dependencies`. (#407)

## 0.7.0 — 2026-10-25

### 🎉 Features

- Adds the structured changelog `.meta/changelog.json` to each package's npm tarball, beside `CHANGELOG.md`. (#398)
- Adds the line "Run '<invocation> <command> --help' for a command's options." to the page that `renderHelp` renders for a group with commands, before any epilog and with a nested group's scoped invocation, and leaves command pages and the pages of groups without commands unchanged. (#402)

### ♻️ Refactoring

- Replaces hand-rolled error descriptions, `instanceof Error` checks on caught values, record guards, directory ascents, and first-letter capitalization in package source with `describeError`, `isError`, `isRecord`, `isRecordOrArray`, `listDirectoryChain`, and `capitalize`, and declares each helper's package from another workspace as a `workspace:*` runtime dependency of the package that adopts it. (#400)

### 🧪 Tests

- Replaces the hand-rolled sleep, stdio spies, and `process.exit` mock in the `cli` tests with `delay`, `captureStdio`, and `throwOnProcessExit`. (#400)
- Rewrites the array-join fixtures and the untagged multi-line template fixtures in the readiness and parser tests as `dedent` templates that render the same text, and declares `@williamthorsen/toolbelt.strings` as a devDependency of each package that now imports `dedent` in its tests. (#401)

## 0.6.0 — 2026-10-24

### 🪦 Removed

- 🚨 **Breaking:** Remove tb-jira from toolbelt.atlassian (#385)

  Removes the `tb-jira` command from `@williamthorsen/toolbelt.atlassian`, which now provides only its library functions, and points the README to `thor-jira` in `@williamthorsen/atlassian-tools` for the same tasks on the command line. The package no longer depends on `@williamthorsen/toolbelt.cli`.

### 📦 Dependencies

- Upgrade dependencies to latest compatible versions (#391)

  Upgrades Node.js, pnpm, and the repository's dependencies to their latest compatible releases, which clears the three dev advisories that failed `nmr audit`. The upgrade to `@williamthorsen/eslint-config-typescript` 20.1.3 adds unicorn lint rules, and the code is adapted to them in the same change.

## 0.5.0 — 2026-10-11

### 🎉 Features

- Adds `readStreamText` to `@williamthorsen/toolbelt.cli/candidate`, which reads a stream such as piped `stdin` to its end as text and waits for a producer that has not yet written, where a synchronous read of a non-blocking pipe fails with `EAGAIN`. (#381)

## 0.4.0 — 2026-10-09

### 🎉 Features

- Adds a `multiple` option for a string or path flag of `parseArgs`, which collects every value of the repeated flag in order into an array that is `[]` when the flag is absent, and which `renderHelp` marks as `(repeatable)` in the generated help. (#373)

### 📚 Documentation

- Updates each kit README to show `rdy run --sources` and a `sources: ['npm:…']` config example, and states that this spelling needs readyup 0.40.0 or later. (#371)

## 0.3.0 — 2026-10-07

### 🎉 Features

- Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.cli` with two checks, `no-node-parse-args` and `no-hand-rolled-flag-scan`, which recommend the package's `parseArgs`, `defineCommand`, `defineGroup`, and `runCli` in place of `node:util`'s `parseArgs` and hand-written flag comparisons, including in runners under `bin/` and `src/bin/`. (#367)

## 0.2.0 — 2026-10-06

### 🎉 Features

- Adds `parseArgs`, which parses arguments strictly against a schema of flags and operands, infers their types from that schema, and throws a `ParseError` on an unknown flag, a missing or extra operand, or a value outside `choices`. (#364)
- Adds `renderHelp`, which returns the help page of a command or a group from the definitions that the parser reads, so that the help text stays in step with the flags that a command accepts. (#364)
- Adds `defineCommand` and `defineGroup`, which build a tree of commands and validate each definition when it is created, and `createCli`, which binds both to a context type that a group's `deriveContext` can extend from the group's own flags. (#364)
- Adds `runCli`, which routes arguments through that tree, handles `-h`/`--help` at every level, reports a usage error as `Error: <message>` with any close command name and a pointer to help, and resolves to an exit code without calling `process.exit`. (#364)

### 🏗️ Internal features

- Adds `@williamthorsen/toolbelt.cli` at 0.1.0 as an empty package scaffolded from `packages/_template` with every tier index set to `export {}`, and registers it in `.config/release-kit.config.ts`, `.github/labels.yaml`, `.meta/label-map.json`, AGENTS.md's domain list, and the `importers` block of `pnpm-lock.yaml`. (#363)

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
