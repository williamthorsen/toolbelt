import { defineVitestConfig } from '@williamthorsen/nmr/vitest';

// This is the ancestor config that Vitest finds by walking up from each package's directory.
// Project roots default to the run root, so these globs match only the package in which Vitest runs.
// The repo's own root-level tests use `vitest.root.config.ts` instead.
export default defineVitestConfig();
