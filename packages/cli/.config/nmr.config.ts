import { defineConfig } from '@williamthorsen/nmr/config';

export default defineConfig({
  // Readiness code backs the ReadyUp kit, which `rdy compile` bundles on its own. Dropping it as an entry
  // point keeps it out of `dist/`, since nothing in a maturity tier imports it.
  build: { extraIgnorePatterns: ['**/readiness/**'] },
});
