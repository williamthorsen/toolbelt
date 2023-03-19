import path from 'node:path';

import { defineConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.js';

export default defineConfig({
  ...baseConfig,
  test: {
    ...typeof baseConfig === 'object' ? (await baseConfig).test : {},
    include: [
      path.resolve(__dirname, 'src/**/*.test.ts'),
    ],
  },
});
