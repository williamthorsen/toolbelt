import { mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config.ts';
import { integrationTestPatterns } from './vitest.integration.config.ts';

export default mergeConfig(baseConfig, {
  test: {
    exclude: integrationTestPatterns,
  },
});
