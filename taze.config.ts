import { defineConfig } from '@williamthorsen/nmr/taze';

/** Dependency-upgrade configuration for this monorepo. */
export default defineConfig({
  // Hold packages that must track a particular version line, so that an upgrade pass never moves them to a new
  // major version.
  packageMode: {
    // Track the engines floor (>=24), which #566 raises to 26; a newer major types APIs that the floor lacks.
    '@types/node': 'minor',
    // Hold typescript at v6 until v7 supports type-aware linting.
    typescript: 'minor',
  },
});
