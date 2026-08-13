# Toolbelt

## Overview

PNPM monorepo of TypeScript utility libraries, each published to npm as `@williamthorsen/toolbelt.{domain}`. Every package organizes its source by API maturity and exposes each tier as a separate export subpath, so consumers opt in to the stability they want. Node >= 24, ESM only.

## Project structure

- `packages/{domain}/`: one published library per domain (arrays, async, datetime, dstructs, enums, errors, filesystem, guards, hof, numbers, objects, packaging, sets, statistics, strings, testing, tools, vitest).
- `packages/_template/`: private scaffold for new packages, excluded from release processing in `.config/release-kit.config.ts`.
- `packages/{domain}/src/{0-strawman,1-proposed,2-draft,3-candidate,4-release}/`: maturity tiers, each with an `index.ts` re-exporting that tier's public surface. `src/internal/`, `src/readiness/`, `src/types/`, and `src/test-utils/` sit outside the tiers and are not exported. `internal/` and `types/` still ship, being build entry points, so `__tests__/support-module-usage.app.unit.test.ts` requires every module in one to have an importer outside test scaffolding; `test-utils/` the build drops, which is what keeps a test helper out of `dist/`. `readiness/` backs a package's ReadyUp kit, which `rdy compile` bundles on its own, and a package holding one drops it from the build through `build.extraIgnorePatterns` in its own `.config/nmr.config.ts`.
- `.agents/`: `codeassembly.yaml` declares the guidance packages `codeassembly sync` resolves; `preferences.yaml` carries the project slug and ticket-ref prefix.
- `.config/`: tool configs. Vitest config lives outside it, in exactly two root files: `vitest.config.ts` and `vitest.root.config.ts`, each a bare call to a `@williamthorsen/nmr/vitest` factory.

Versions are independent per package.

## Commands

Runner conventions (discovery, invocation, root vs. package registries, hooks) come from the ambient `nmr` rulebook, which `codeassembly sync` writes into the machine-local guidance files. CI runs `pnpm exec nmr ci` (`.github/workflows/code-quality.yaml`); a dependency audit runs separately, on pull requests and daily (`.github/workflows/audit.yaml`). `pnpm exec rdy run --packages` runs the checks each tool dependency ships for its own adoption; nothing in CI runs it, so run it by hand after a dependency upgrade.

## Architecture

**Build.** There is no repo-local build script: `nmr build` delegates to the managed `nmr-compile`. Typechecking is separate, via `tsgo` (`@typescript/native-preview`), independent of the `typescript` package.

**Compiler options.** Root `tsconfig.json` extends `@williamthorsen/tsconfig` (`@tsconfig/strictest` inlined, plus a Node-only layer at ES2025). Packages extend the root and declare no `compilerOptions`, carrying only `$schema`, `extends`, and `include`.

**Exports.** `package.json` maps each maturity tier to its own subpath:

- default: `4-release`
- `/candidate`: `3-candidate`
- `/draft`: `2-draft`
- `/proposed`: `1-proposed`

`0-strawman` is unexported. `__tests__/workspace-exports.app.unit.test.ts` enforces the correspondence in both directions: every export target names a tier holding an `index.ts`, and every tier but `0-strawman` has a subpath. A workspace with no tier directories, such as `tools`, is out of its scope.

**Cross-package imports** use the published name plus the maturity subpath (`import { SeededRng } from '@williamthorsen/toolbelt.numbers/candidate'`), never relative paths across a package boundary. Workspace deps are declared `workspace:*`.

**Adoption.** A utility earns a place by cross-repo demand, or by supplying a capability its platform structurally lacks -- the language for most packages, Vitest for `vitest`. Hand-roll count alone is not the measure: a helper nobody hand-rolls may only show that people settle for the platform's weaker alternative. Adopting one from another repository reconsiders its API; it is not a port.

**Test-utility routing.** A test-only utility goes to `vitest` if it imports the Vitest API and to `testing` if it does not. Every other utility goes to its domain package. `__tests__/runner-agnostic-imports.app.unit.test.ts` enforces the split, exempting a workspace that declares Vitest under `dependencies` or `peerDependencies` -- the fields that install it for a consumer.

**Release.** Run release-kit locally (`prepare`, `commit`, `tag`), then `git push && git push --tags`. The tag push triggers `publish.yaml`, which publishes with provenance via npm trusted publishing (OIDC); the repo holds no `NPM_TOKEN`. Tags must be pushed from a developer machine: GitHub does not fire workflows for tags pushed with `GITHUB_TOKEN`, so the dispatch `release.yaml` path alone cannot publish.

## Code style

- Intra-package imports carry an explicit `.ts` extension (`./shuffle.ts`). `allowImportingTsExtensions` is on and `nmr-compile` rewrites it at build time.
- Exported functions in a maturity tier carry JSDoc `@category` and `@stage {maturity}`, plus `@experimental` where applicable. Keep `@stage` in sync with the containing folder; `__tests__/stage-tag-alignment.app.unit.test.ts` enforces this.
- Exported functions in `src/internal/` and `src/readiness/` carry `@internal` instead. Neither is a maturity tier, so neither has an `@stage` value to take, and the alignment test derives a tier only from a `src/{n}-{tier}/` segment -- any `@stage` there is unvalidated by construction.
- Tests live in `__tests__/` beside the source, named `{subject}.{tier}.test.ts`. `describe()` takes the function reference, not a string: `describe(shuffle, () => ...)`.
- Dependency versions are pinned exactly (`savePrefix: ''` in `pnpm-workspace.yaml`).
- External runtime dependencies are avoided rather than forbidden: reach for one only where hand-rolling would be worse, and prefer a workspace helper where one fits.
- Name a function by what it returns and what it does: `find*` for one result or none, `list*` for an array, otherwise the most specific accurate verb, with any other container named in the tail (`extractPlaceholderSet`). `get*` is the fallback for when no more specific verb is accurate, not the default.
- Scope-bound utilities are `using` + `Disposable`; one-shot helpers are plain functions. A `Disposable` composes upward into a hook-registering wrapper and the reverse does not, so it is the form to reach for where both would serve.

## Gotchas

- **`4-release` is empty for most packages.** Most hold `export {}` there, with the real API in `3-candidate`. Import from `/candidate` unless you have confirmed the symbol is promoted.
- **Promoting an API is a move plus three edits**: relocate the file, update both tiers' `index.ts`, and update the `@stage` tag.
- **Suites are Vitest projects selected by filename, not by config file.** The projects are the isolation ladder `unit`, `tool`, `localhost`, and `remote`, named for the furthest thing a test reaches and matched on the segment immediately before `.test.ts`. `unit` is the residual: any other segment lands there, which is why `stage-tag-alignment.app.unit.test.ts` carries its tier in the tail and leaves `app` as documentation. `nmr test` runs `unit` and `tool`; `nmr test:all` runs everything.
- **`passWithNoTests` is set on every project.** A suite with no matching files exits green instead of failing, so a package that loses its tests passes just as quietly. The placeholder `todo` test in `packages/_template` is what keeps a freshly scaffolded package from being the first such case.
- **Packages carry no Vitest config.** Vitest walks up from the run directory to the root `vitest.config.ts` while keeping `root` at the cwd, so `nmr test` inside a package collects that package's tests alone. A per-package config re-adds a file that changes nothing.
- **`strict-lint` downgrades some rules to warnings.** The set is `advisoryRuleSeverities`, exported by `@williamthorsen/eslint-config-typescript`; violations of those rules do not fail `check:strict`. The repo holds no local deferral list of its own.
- **pnpm enforces a release soak before newly published third-party versions install.** See `minimumReleaseAge` in `pnpm-workspace.yaml` for the window and the first-party exclusions.
