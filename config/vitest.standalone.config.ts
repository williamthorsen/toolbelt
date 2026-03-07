import { mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config.js';
import { integrationTestPatterns } from './vitest.integration.config.js';

export default mergeConfig(baseConfig, {
  test: {
    exclude: integrationTestPatterns,
  },
});
