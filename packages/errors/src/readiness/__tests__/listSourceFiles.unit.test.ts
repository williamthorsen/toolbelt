import { describe, expect, it } from 'vitest';

import { findExemption } from '../exemptions.ts';
import { listSourceFiles } from '../listSourceFiles.ts';

describe(listSourceFiles, () => {
  it('keeps JavaScript and TypeScript sources', () => {
    const paths = ['src/read.ts', 'src/Panel.tsx', 'scripts/build.mjs', 'bin/wrap.cjs'.replace('bin/', 'lib/')];

    expect(listSourceFiles(paths)).toStrictEqual(paths);
  });

  it('drops files that are not sources', () => {
    expect(listSourceFiles(['README.md', 'package.json', 'src/read.ts'])).toStrictEqual(['src/read.ts']);
  });

  it('drops bootstrap wrappers, tests, and dependencies', () => {
    const paths = [
      'packages/kb/bin/kb.js',
      'src/__tests__/read.unit.test.ts',
      'src/read.spec.tsx',
      'node_modules/left-pad/index.js',
      'src/read.ts',
    ];

    expect(listSourceFiles(paths)).toStrictEqual(['src/read.ts']);
  });
});

describe(findExemption, () => {
  it('names why a bootstrap wrapper is exempt', () => {
    expect(findExemption('packages/agents/bin/codeassembly.js')).toContain('bootstrap wrapper');
  });

  it('exempts nothing in ordinary source', () => {
    expect(findExemption('src/lib/read.ts')).toBeUndefined();
  });

  it('does not mistake a path merely containing "bin" for a wrapper directory', () => {
    expect(findExemption('src/binding/read.ts')).toBeUndefined();
  });
});
