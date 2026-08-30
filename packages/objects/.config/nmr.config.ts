import { defineConfig } from '@williamthorsen/nmr/config';

export default defineConfig({
  // The strawman tier carries no export subpath, so nothing published can reach it, and readiness code backs
  // the ReadyUp kit, which `rdy compile` bundles on its own. Dropping both as entry points keeps them out of
  // `dist/`, since nothing in a maturity tier imports either.
  build: { extraIgnorePatterns: ['**/0-strawman/**', '**/readiness/**'] },
});
