import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { listSourceFiles } from '../listSourceFiles.ts';

const SOURCE_TREE = {
  '__tests__/covered.unit.test.ts': '',
  'nested/deep.ts': '',
  'shallow.ts': '',
};

describe(listSourceFiles, () => {
  it('yields every TypeScript file under the directory', () => {
    using tree = createTempDir(SOURCE_TREE);

    const found = [...listSourceFiles(tree.dir, new Set())].map((filePath) => path.relative(tree.dir, filePath));

    expect(found.toSorted()).toStrictEqual([
      path.join('__tests__', 'covered.unit.test.ts'),
      path.join('nested', 'deep.ts'),
      'shallow.ts',
    ]);
  });

  it('descends into no directory named in the excluded set', () => {
    using tree = createTempDir(SOURCE_TREE);

    const found = [...listSourceFiles(tree.dir, new Set(['__tests__', 'nested']))];

    expect(found).toStrictEqual([path.join(tree.dir, 'shallow.ts')]);
  });

  it('yields nothing for a directory that does not exist', () => {
    using tree = createTempDir(SOURCE_TREE);

    const found = [...listSourceFiles(path.join(tree.dir, 'absent'), new Set())];

    expect(found).toStrictEqual([]);
  });

  it('yields no file that is not a TypeScript source', () => {
    using tree = createTempDir({ ...SOURCE_TREE, 'notes.md': '' });

    const found = [...listSourceFiles(tree.dir, new Set(['__tests__', 'nested']))];

    expect(found).toStrictEqual([path.join(tree.dir, 'shallow.ts')]);
  });
});
