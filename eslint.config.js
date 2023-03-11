import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import config from '@williamthorsen/eslint-config-typescript';

export default [
  ...config,
  {
    // Completely ignore these files
    ignores: [
      '**/*.sh',
      'packages/cdk/.*/**/*',
    ],
  },
  {
    files: ['**/*.mts', '**/*.ts', '**/*.tsx', '**/*.md/*.ts'],
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.eslint.json',
          './packages/*/tsconfig.eslint.json',
        ],
        tsconfigRootDir: __dirname,
      },
    },
  },
];
