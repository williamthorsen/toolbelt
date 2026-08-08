import { defineRdyConfig } from 'readyup';

export default defineRdyConfig({
  internal: {
    infix: 'internal',
  },
  // The checks in these packages will be run by `rdy run --packages`.
  packages: [
    '@williamthorsen/eslint-config-typescript',
    '@williamthorsen/nmr',
    '@williamthorsen/release-kit',
    '@williamthorsen/tsconfig',
    'codeassembly',
    'readyup',
    'v11y-check',
  ],
});
