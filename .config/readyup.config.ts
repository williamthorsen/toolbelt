import { defineRdyConfig } from 'readyup';

export default defineRdyConfig({
  internal: {
    infix: 'internal',
  },
  // The checks in these packages will be run by `rdy run --packages`. The toolbelt entries are workspaces of
  // this repo, which readyup resolves without a declared dependency on them.
  packages: [
    '@williamthorsen/eslint-config-typescript',
    '@williamthorsen/nmr',
    '@williamthorsen/release-kit',
    '@williamthorsen/toolbelt.errors',
    '@williamthorsen/toolbelt.numbers',
    '@williamthorsen/toolbelt.vitest',
    '@williamthorsen/tsconfig',
    'codeassembly',
    'readyup',
    'v11y-check',
  ],
});
