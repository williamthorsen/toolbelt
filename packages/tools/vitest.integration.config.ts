import { defineConfig } from 'vitest/config';

import { integrationTestPatterns } from '../../vitest.integration.config.js';
import baseConfig from './vitest.config.js';

export default defineConfig({
  ...baseConfig,
  test: {
    ...typeof baseConfig === 'object' ? (await baseConfig).test : {},
    include: integrationTestPatterns,
  },
});
