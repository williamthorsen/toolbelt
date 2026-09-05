import baseConfig, { createConfig } from '@williamthorsen/eslint-config-typescript';
import { defineConfig } from 'eslint/config';

const config = defineConfig([
  ...baseConfig,
  {
    // Completely ignore these files
    ignores: [
      '**/*.sh', //
      // Compiled kit bundles are generated; an autofix here would break the hash that rdy records for them.
      '**/.readyup/**/*.js',
      '**/coverage/**',
      '**/dist/**',
      '**/local/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.md/*.ts'],
    languageOptions: {
      parserOptions: {
        // Anchor the project service (enabled by the base config) at the repo root.
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...defineConfig({
    extends: [await createConfig.vitest()],
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-thenable': 'off',
      'unicorn/no-useless-undefined': 'off',
    },
  }),
  {
    // A package's `bin` names its compiled path, so the rule reads every bin source as a file needing no
    // shebang until it is told the build's source-to-output mapping.
    files: ['packages/*/src/**/*.ts'],
    rules: {
      'n/hashbang': [
        'error',
        { convertPath: [{ include: ['src/**/*.ts'], replace: [String.raw`^src/(.+)\.ts$`, 'dist/esm/$1.js'] }] },
      ],
    },
  },
  {
    files: ['**/.github/scripts/**/*', '**/scripts/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
]);

export default config;
