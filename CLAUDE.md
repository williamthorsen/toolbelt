# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

🚨**Important:** Read and follow the instructions in `.agents/shared/startup.md`.
Be aware that `.agents/shared` is a symlink.

## Overview

This is a PNPM monorepo containing TypeScript utility libraries organized by domain (arrays, strings, objects, etc.). Each package follows a maturity-based organization with folders `0-strawman`, `1-proposed`, `2-draft`, `3-candidate`, and `4-release`.

## Essential Commands

### Workspace Management

- `pnpm install` - Install all dependencies (run from anywhere in the project)
- `nmr {script}` - Run a script via the nmr runner: from the repo root for the whole monorepo, or from a package directory for that package

### Development Commands

- `nmr check` - Run all quality checks (typecheck, format check, lint check, tests)
- `nmr check:strict` - Run strict quality checks including coverage and agent-file sync
- `nmr ci` - Build, then run strict checks and the dependency audit (the full CI gate)
- `nmr build` - Build all packages
- `nmr typecheck` - Type checking across all packages
- `nmr lint` - Lint and fix issues across all packages
- `nmr lint:check` - Lint check without fixing
- `nmr test` - Run all tests
- `nmr test:coverage` - Run tests with coverage reports
- `nmr audit` - Run the dependency vulnerability audit via `v11y`

### Individual Package Commands

From within a package directory (e.g., `cd packages/arrays`):

- `nmr build` - Build this package
- `nmr test` - Run tests for this package
- `nmr typecheck` - Type check this package
- `nmr lint` - Lint this package

## Package Architecture

### Maturity-Based Organization

Each package uses a maturity-based folder structure:

- `0-strawman/` - Experimental, unstable APIs
- `1-proposed/` - Proposed APIs under consideration
- `2-draft/` - APIs being refined
- `3-candidate/` - Stable APIs ready for release
- `4-release/` - Released, stable APIs

### Package Exports

Packages export at multiple maturity levels:

- Default: `import {} from '@williamthorsen/toolbelt.{package}'` (4-release)
- Candidate: `import {} from '@williamthorsen/toolbelt.{package}/candidate'` (3-candidate)
- Draft: `import {} from '@williamthorsen/toolbelt.{package}/draft'` (2-draft)
- Proposed: `import {} from '@williamthorsen/toolbelt.{package}/proposed'` (1-proposed)

### Available Packages

- `arrays` - Array manipulation utilities
- `async` - Asynchronous utilities (debounce, delay, etc.)
- `datetime` - Date and time utilities
- `dstructs` - Data-structure utilities (queues, etc.)
- `enums` - Enum manipulation utilities
- `guards` - Type guards and assertions
- `hof` - Higher-order functions
- `nodejs` - Node.js specific utilities
- `numbers` - Number manipulation and generation utilities
- `objects` - Object manipulation utilities
- `sets` - Set operations and utilities
- `statistics` - Statistics and probability-distribution utilities
- `strings` - String manipulation and formatting utilities
- `tools` - Core utilities and constants

## Testing

Uses Vitest for testing with multiple configurations:

- `vitest.config.ts` - Standard unit tests
- `vitest.standalone.config.ts` - Unit tests, excluding integration patterns
- `vitest.integration.config.ts` - Integration tests

## Build System

- ESBuild for compilation via `config/build.ts`
- TypeScript for type generation
- Uses workspace dependencies between packages
