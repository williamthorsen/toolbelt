import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import tseslint from 'typescript-eslint';

const thisFilePath = fileURLToPath(import.meta.url);
const thisDirPath = dirname(thisFilePath);

import baseConfig, { createConfig, patterns } from '@williamthorsen/eslint-config-typescript';

/**
 * @type {import('eslint').Linter.FlatConfig[]}
 */
export default [
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
      'n/no-extraneous-import': 'off',
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
      'unicorn/no-array-callback-reference': 'off', // 🔴⚫ Overly prescriptive
      'unicorn/no-instanceof-builtins': [
        'warn',
        {
          exclude: ['Array'],
        },
      ],
      'unicorn/require-module-specifiers': 'off', // 🔴⚫ Too prescriptive: disallows placeholders.
    },
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.md/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json', './packages/*/tsconfig.eslint.json'],
        tsconfigRootDir: thisDirPath,
      },
    },
  },
  ...tseslint.config({
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
    // App/consistency tests (e.g. version-alignment) call helpers that register their own
    // describe/it blocks, so the top-level call is legitimate despite vitest/require-hook.
    files: ['**/*.app.test.ts'],
    rules: {
      'vitest/require-hook': 'off',
    },
  },
  {
    files: ['**/.github/scripts/**/*', '**/scripts/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
];
