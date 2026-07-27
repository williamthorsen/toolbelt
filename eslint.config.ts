import baseConfig, { createConfig, patterns } from '@williamthorsen/eslint-config-typescript';
import { defineConfig } from 'eslint/config';

import { deferredLintRules } from './.config/eslint/deferred-lint-rules.ts';

const config = defineConfig([
  ...baseConfig,
  {
    // Completely ignore these files
    ignores: [
      '**/*.sh', //
      '**/coverage/**',
      '**/dist/**',
      '**/local/**',
    ],
  },
  {
    files: patterns.codeFiles,
    rules: {
      ...deferredLintRules,
      'unicorn/no-instanceof-builtins': [
        'warn',
        {
          exclude: ['Array'],
        },
      ],
    },
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
      'vitest/max-expects': 'off', // 🟠⚫
      'vitest/padding-around-all': 'off', // 🟠⚫
      'vitest/padding-around-expect-groups': 'off', // 🟠⚫
      'vitest/prefer-lowercase-title': 'off', // 🟠⚫
    },
  }),
  {
    files: ['**/.github/scripts/**/*', '**/scripts/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
]);

export default config;
