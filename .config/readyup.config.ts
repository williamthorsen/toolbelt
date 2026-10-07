import { defineRdyConfig } from 'readyup';

export default defineRdyConfig({
  internal: {
    infix: 'internal',
  },
  // `rdy run --sources` runs the checks in these sources. The toolbelt entries are workspaces of this repo,
  // which readyup resolves without a declared dependency on them.
  sources: [
    'github:williamthorsen/.github',
    'npm:@williamthorsen/eslint-config-typescript',
    'npm:@williamthorsen/nmr',
    'npm:@williamthorsen/release-kit',
    'npm:@williamthorsen/toolbelt.arrays',
    'npm:@williamthorsen/toolbelt.async',
    'npm:@williamthorsen/toolbelt.cli',
    'npm:@williamthorsen/toolbelt.enums',
    'npm:@williamthorsen/toolbelt.errors',
    'npm:@williamthorsen/toolbelt.filesystem',
    'npm:@williamthorsen/toolbelt.guards',
    'npm:@williamthorsen/toolbelt.numbers',
    'npm:@williamthorsen/toolbelt.objects',
    'npm:@williamthorsen/toolbelt.packaging',
    'npm:@williamthorsen/toolbelt.strings',
    'npm:@williamthorsen/toolbelt.testing',
    'npm:@williamthorsen/toolbelt.vitest',
    'npm:@williamthorsen/tsconfig',
    'npm:codeassembly',
    'npm:readyup',
    'npm:v11y-check',
  ],
});
