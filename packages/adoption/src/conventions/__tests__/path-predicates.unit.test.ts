import { describe, expect, it } from 'vitest';

import { isAdoptableSource, isBinWrapper, isInTestDirectory, isJsTsSource, isTestFile } from '../path-predicates.ts';

describe(isAdoptableSource, () => {
  it('claims ordinary source', () => {
    expect(isAdoptableSource('src/read.ts')).toBe(true);
  });

  it('declines every path exempted by one of its parts', () => {
    const exempt = ['README.md', 'bin/run.js', 'src/read.unit.test.ts', 'src/__tests__/fixtures/sample.ts'];

    expect(exempt.filter((path) => isAdoptableSource(path))).toStrictEqual([]);
  });
});

describe(isBinWrapper, () => {
  it('claims a path inside a bin directory', () => {
    expect(isBinWrapper('packages/agents/bin/codeassembly.js')).toBe(true);
  });

  it('claims a bin directory at the root', () => {
    expect(isBinWrapper('bin/run.js')).toBe(true);
  });

  it('does not mistake a path merely containing "bin" for a wrapper directory', () => {
    expect(isBinWrapper('src/binding/read.ts')).toBe(false);
  });
});

describe(isInTestDirectory, () => {
  it('claims a path inside a test directory', () => {
    expect(isInTestDirectory('src/__tests__/read.unit.test.ts')).toBe(true);
  });

  it('claims a helper beside a suite, which is in the directory without being a test', () => {
    expect(isInTestDirectory('src/__tests__/fixtures/sample.ts')).toBe(true);
  });

  it('does not claim ordinary source', () => {
    expect(isInTestDirectory('src/read.ts')).toBe(false);
  });
});

describe(isJsTsSource, () => {
  it('claims every JavaScript and TypeScript extension read by the sweep', () => {
    const paths = ['src/read.ts', 'src/Panel.tsx', 'scripts/build.mjs', 'lib/wrap.cjs', 'a.js', 'b.jsx', 'c.mts'];

    expect(paths.filter((path) => !isJsTsSource(path))).toStrictEqual([]);
  });

  it('does not claim a file that is not a source', () => {
    expect(['README.md', 'package.json', 'a.json'].filter((path) => isJsTsSource(path))).toStrictEqual([]);
  });
});

describe(isTestFile, () => {
  it('claims a test file by its suffix', () => {
    expect(isTestFile('src/read.unit.test.ts')).toBe(true);
  });

  it('claims a spec file', () => {
    expect(isTestFile('src/read.spec.tsx')).toBe(true);
  });

  it('does not claim a helper beside a suite, which has no test suffix', () => {
    expect(isTestFile('src/__tests__/fixtures/sample.ts')).toBe(false);
  });

  it('does not claim ordinary source', () => {
    expect(isTestFile('src/read.ts')).toBe(false);
  });
});
