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
    rules: deferredLintRules,
  },
  {
    files: patterns.codeFiles,
    rules: {
      'unicorn/consistent-class-member-order': 'off', // use `@typescript-eslint/member-ordering` instead
      'unicorn/numeric-separators-style': [
        'error',
        {
          onlyIfContainsSeparator: false,
          hexadecimal: { minimumDigits: 0, groupLength: 4 },
          binary: { minimumDigits: 0, groupLength: 4 },
          octal: { minimumDigits: 0, groupLength: 4 },
          number: { minimumDigits: 5, groupLength: 3, fractionGroupLength: 3 },
        },
      ], // 🔴🟠
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
