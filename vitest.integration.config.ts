import path from 'node:path';

import { defineConfig } from 'vitest/config';

import baseConfig from './vitest.config.js';

export const integrationTestPatterns = [
  path.resolve(__dirname, 'packages/*/src/**/*.int.test.ts'),
];

export default defineConfig({
  ...baseConfig,
  test: {
    ...typeof baseConfig === 'object' ? (await baseConfig).test : {},
    include: integrationTestPatterns,
  },
});

