import { describe, expect, it } from 'vitest';

import { listTestFiles } from '../listTestFiles.ts';

describe(listTestFiles, () => {
  it('keeps test files and drops everything else', () => {
    const paths = ['src/main.ts', 'src/__tests__/main.unit.test.ts', 'README.md', 'src/main.spec.tsx'];

    expect(listTestFiles(paths)).toStrictEqual(['src/__tests__/main.unit.test.ts', 'src/main.spec.tsx']);
  });

  it('drops a dependency and a compiled kit bundle', () => {
    const paths = ['node_modules/pkg/index.test.js', '.readyup/kits/default.js', 'src/a.test.ts'];

    expect(listTestFiles(paths)).toStrictEqual(['src/a.test.ts']);
  });
});
