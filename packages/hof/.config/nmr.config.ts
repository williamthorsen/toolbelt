import { defineConfig } from '@williamthorsen/nmr/config';

export default defineConfig({
  // The strawman tier carries no export subpath, so nothing published can reach it. Dropping it as an entry
  // point keeps it out of `dist/`, since nothing outside it imports it.
  build: { extraIgnorePatterns: ['**/0-strawman/**'] },
});
