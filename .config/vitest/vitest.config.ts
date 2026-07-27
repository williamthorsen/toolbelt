import { mergeConfig } from 'vitest/config';

export const baseConfig = {
  test: {
    coverage: {
      enabled: false, // don't check coverage unless the `--coverage` flag is passed
      exclude: ['**/__tests__/*', '**/index.ts', '**/*.d.ts', '**/*.types.ts'],
      include: ['**/src/**/*.{ts,tsx}'],
      provider: 'v8' as const,
    },
    exclude: ['**/node_modules/**'],
    silent: 'passed-only', // see logs from failing tests only
    watch: false, // don't enter watch mode unless the `--watch` flag is passed
  },
};

export default mergeConfig(baseConfig, {
  test: {
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
  },
});
