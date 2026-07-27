import { mergeConfig } from 'vitest/config';

import { baseConfig } from './vitest.config.ts';

export const integrationTestPatterns = ['**/__tests__/**/*.int.test.{ts,tsx}'];

export default mergeConfig(baseConfig, {
  test: {
    include: integrationTestPatterns,
  },
});
