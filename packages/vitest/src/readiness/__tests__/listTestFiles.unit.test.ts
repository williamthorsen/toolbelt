import { describe, expect, it } from 'vitest';

import { listTestFiles } from '../listTestFiles.ts';

describe(listTestFiles, () => {
  it('keeps test files and drops everything else', () => {
    const paths = ['src/main.ts', 'src/__tests__/main.unit.test.ts', 'README.md', 'src/main.spec.tsx'];

    expect(listTestFiles(paths)).toStrictEqual(['src/__tests__/main.unit.test.ts', 'src/main.spec.tsx']);
  });

  it('drops a dependency’s tests', () => {
    const paths = ['node_modules/pkg/index.test.js', 'src/a.test.ts'];

    expect(listTestFiles(paths)).toStrictEqual(['src/a.test.ts']);
  });
});
