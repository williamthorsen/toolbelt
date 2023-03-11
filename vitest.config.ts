import path from 'node:path';

import { defineConfig } from 'vitest/config';

const config = defineConfig({
  resolve: {
    alias: {
      '~api': path.resolve(__dirname, 'packages/api/src'),
    },
  },
  test: {
    coverage: {
      all: true, // include untested files in the report
      enabled: false, // don't check coverage unless the `--coverage` flag is passed
      exclude: [
        '**/__tests__/*',
        '**/index.ts',
        '**/*.d.ts',
        '**/*.types.ts',
      ],
      include: [
        '**/src/**/*.ts',
      ],
    },
    include: [
      path.resolve(__dirname, 'packages/*/src/**/*.test.ts'),
    ],
    watch: false, // don't enter watch mode unless the `--watch` flag is passed
  },
});

export default config;
