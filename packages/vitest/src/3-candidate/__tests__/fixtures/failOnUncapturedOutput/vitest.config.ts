import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['*.fixture.ts'],
    // `list` runs the setup file's `afterEach` before the test file's own, the order in which an `afterEach`
    // check would miss the test file's output.
    sequence: { hooks: 'list' },
    setupFiles: ['./setup.ts'],
  },
});
