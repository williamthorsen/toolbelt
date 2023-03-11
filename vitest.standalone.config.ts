import { defineConfig } from 'vitest/config';

import baseConfig from './vitest.config.js';
import { integrationTestPatterns } from './vitest.integration.config.js';

export default defineConfig({
  ...baseConfig,
  test: {
    ...typeof baseConfig === 'object' ? (await baseConfig).test : {},
    exclude: integrationTestPatterns,
  },
});
