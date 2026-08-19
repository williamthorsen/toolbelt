import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { listSourceFiles } from '../listSourceFiles.ts';

const createdDirs: string[] = [];

describe(listSourceFiles, () => {
  afterEach(() => {
    for (const dir of createdDirs) fs.rmSync(dir, { force: true, recursive: true });
    createdDirs.length = 0;
  });

  it('yields every TypeScript file under the directory', () => {
    const rootDir = createSourceTree();

    const found = [...listSourceFiles(rootDir, new Set())].map((filePath) => path.relative(rootDir, filePath));

    expect(found.toSorted()).toStrictEqual([
      path.join('__tests__', 'covered.unit.test.ts'),
      path.join('nested', 'deep.ts'),
      'shallow.ts',
    ]);
  });

  it('descends into no directory named in the excluded set', () => {
    const rootDir = createSourceTree();

    const found = [...listSourceFiles(rootDir, new Set(['__tests__', 'nested']))];

    expect(found).toStrictEqual([path.join(rootDir, 'shallow.ts')]);
  });

  it('yields nothing for a directory that does not exist', () => {
    const found = [...listSourceFiles(path.join(createSourceTree(), 'absent'), new Set())];

    expect(found).toStrictEqual([]);
  });

  it('yields no file that is not a TypeScript source', () => {
    const rootDir = createSourceTree();
    fs.writeFileSync(path.join(rootDir, 'notes.md'), '');

    const found = [...listSourceFiles(rootDir, new Set(['__tests__', 'nested']))];

    expect(found).toStrictEqual([path.join(rootDir, 'shallow.ts')]);
  });
});

// region | Helpers

/** Builds a throwaway source tree holding a shallow module, a nested module, and a test file. */
function createSourceTree(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolbelt-sources-'));
  createdDirs.push(rootDir);

  fs.mkdirSync(path.join(rootDir, 'nested'));
  fs.mkdirSync(path.join(rootDir, '__tests__'));
  fs.writeFileSync(path.join(rootDir, 'shallow.ts'), '');
  fs.writeFileSync(path.join(rootDir, 'nested', 'deep.ts'), '');
  fs.writeFileSync(path.join(rootDir, '__tests__', 'covered.unit.test.ts'), '');

  return rootDir;
}

// endregion | Helpers
