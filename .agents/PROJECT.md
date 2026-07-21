# Toolbelt

@nmr/AGENTS.md

## Overview

PNPM monorepo of TypeScript utility libraries, each published to npm as `@williamthorsen/toolbelt.{domain}`. Every package organizes its source by API maturity and exposes each tier as a separate export subpath, so consumers opt in to the stability they want. Node >= 24, ESM only, no runtime dependencies outside the workspace.

## Project structure

- `packages/{domain}/`: one published library per domain (arrays, async, datetime, dstructs, enums, guards, hof, nodejs, numbers, objects, sets, statistics, strings, tools).
- `packages/_template/`: private scaffold for new packages, excluded from release processing in `.config/release-kit.config.ts`.
- `packages/{domain}/src/{0-strawman,1-proposed,2-draft,3-candidate,4-release}/`: maturity tiers, each with an `index.ts` re-exporting that tier's public surface. `src/internal/` and `src/types/` sit outside the tiers and are not exported.
- `.config/`: tool configs (nmr, release-kit, strict-lint, v11y, worktrunk). The root `vitest.*.config.ts` files are one-line re-exports of `config/vitest.*.config.ts`.

Versions are independent per package. `dstructs` and `statistics` are pre-1.0; the rest are 3.x to 4.x.

## Commands

Runner conventions (discovery, invocation, root vs. package registries, hooks) come from `.agents/nmr/AGENTS.md`, imported at the top of this file. CI runs `pnpm exec nmr build && pnpm exec nmr check:strict` (`.github/workflows/code-quality.yaml`); locally, `nmr ci` adds the dependency audit on top of those.

## Architecture

**Build.** There is no repo-local build script: `nmr build` delegates to the managed `nmr-compile`. Typechecking is separate, via `tsgo` (`@typescript/native-preview`), independent of the `typescript` package.

**Exports.** `package.json` maps each maturity tier to its own subpath:

- default: `4-release`
- `/candidate`: `3-candidate`
- `/draft`: `2-draft`
- `/proposed`: `1-proposed`

`0-strawman` is unexported.

**Cross-package imports** use the published name plus the maturity subpath (`import { SeededRng } from '@williamthorsen/toolbelt.numbers/candidate'`), never relative paths across a package boundary. Workspace deps are declared `workspace:*`.

**Release.** Run release-kit locally (`prepare`, `commit`, `tag`), then `git push && git push --tags`. The tag push triggers `publish.yaml`, which publishes with provenance via npm trusted publishing (OIDC); the repo holds no `NPM_TOKEN`. Tags must be pushed from a developer machine: GitHub does not fire workflows for tags pushed with `GITHUB_TOKEN`, so the dispatch `release.yaml` path alone cannot publish.

## Code style

- Intra-package imports carry an explicit `.ts` extension (`./shuffle.ts`). `allowImportingTsExtensions` is on and `nmr-compile` rewrites it at build time.
- Exported functions carry JSDoc `@category` and `@stage {maturity}`, plus `@experimental` where applicable. Keep `@stage` in sync with the containing folder; `__tests__/stage-tag-alignment.app.test.ts` enforces this.
- Tests live in `__tests__/` beside the source, named `{subject}.{unit|int|app}.test.ts`. `describe()` takes the function reference, not a string: `describe(shuffle, () => ...)`.
- Dependency versions are pinned exactly (`savePrefix: ''` in `pnpm-workspace.yaml`).

## Gotchas

- **`4-release` is empty for most packages.** Only `enums`, `guards`, and `objects` export anything from the default entry point. `arrays`, `strings`, `numbers`, `sets`, and the rest hold `export {}` there, with the real API in `3-candidate`. Import from `/candidate` unless you have confirmed the symbol is promoted.
- **Promoting an API is a move plus three edits**: relocate the file, update both tiers' `index.ts`, and update the `@stage` tag.
- **`nmr test` runs unit, integration, and app tests.** `vitest.standalone.config.ts` is the unit-only config (it excludes `*.int.test.ts`); the default config includes everything.
- **`strict-lint` downgrades some rules to warnings.** See `.config/deferred-unicorn-rules.ts` for the current set. Violations of those rules do not fail `check:strict`.
- **The Node version is pinned in both `.tool-versions` and `.github/workflows/code-quality.yaml`.** `__tests__/version-alignment.app.test.ts` fails when they diverge; bump both.
- **pnpm enforces a release soak before newly published third-party versions install.** See `minimumReleaseAge` in `pnpm-workspace.yaml` for the window and the first-party exclusions.
