import { describe, expect, it } from 'vitest';

import { listSourceFiles } from '../listSourceFiles.ts';

describe(listSourceFiles, () => {
  it('keeps JavaScript and TypeScript sources', () => {
    const paths = ['src/read.ts', 'src/Panel.tsx', 'scripts/build.mjs', 'lib/wrap.cjs'];

    expect(listSourceFiles(paths)).toStrictEqual(paths);
  });

  it('drops files that are not sources', () => {
    expect(listSourceFiles(['README.md', 'package.json', 'src/read.ts'])).toStrictEqual(['src/read.ts']);
  });

  it('drops bootstrap wrappers, compiled kits, tests, and dependencies', () => {
    const paths = [
      'packages/kb/bin/kb.js',
      'packages/thrive/.readyup/kits/backend.js',
      'src/__tests__/read.unit.test.ts',
      'src/read.spec.tsx',
      'node_modules/left-pad/index.js',
      'src/read.ts',
    ];

    expect(listSourceFiles(paths)).toStrictEqual(['src/read.ts']);
  });
});
