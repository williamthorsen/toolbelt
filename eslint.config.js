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
        project: ['./tsconfig.eslint.json', './packages/*/tsconfig.eslint.json'],
        tsconfigRootDir: thisDirPath,
      },
    },
  },
  ...tseslint.config({
    extends: [await createConfig.vitest()],
    files: ['**/*.test.ts'],
    rules: {
      'vitest/max-expects': 'off', // 🟠⚫
      'vitest/padding-around-all': 'off', // 🟠⚫
      'vitest/padding-around-expect-groups': 'off', // 🟠⚫
      'vitest/prefer-lowercase-title': 'off', // 🟠⚫
    },
  }),
];
