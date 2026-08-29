import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectReachableModuleSet } from '../collectReachableModuleSet.ts';
import { createTempDir } from '../createTempDir.ts';

describe(collectReachableModuleSet, () => {
  it('collects the entry and everything it reaches transitively', () => {
    using tree = createTempDir({
      'index.ts': "export { shuffle } from './shuffle.ts';",
      'shuffle.ts': "import { clamp } from './internal/clamp.ts';",
      'internal/clamp.ts': '',
      'orphan.ts': '',
    });

    expect(collectReachableModuleSet(path.join(tree.dir, 'index.ts'))).toStrictEqual(
      new Set([
        path.join(tree.dir, 'index.ts'),
        path.join(tree.dir, 'shuffle.ts'),
        path.join(tree.dir, 'internal', 'clamp.ts'),
      ]),
    );
  });

  it('terminates on a cycle', () => {
    using tree = createTempDir({
      'index.ts': "export { a } from './a.ts';",
      'a.ts': "import { b } from './b.ts';",
      'b.ts': "import { a } from './a.ts';",
    });

    expect(collectReachableModuleSet(path.join(tree.dir, 'index.ts'))).toStrictEqual(
      new Set([path.join(tree.dir, 'index.ts'), path.join(tree.dir, 'a.ts'), path.join(tree.dir, 'b.ts')]),
    );
  });

  it('follows no specifier naming another package', () => {
    using tree = createTempDir({
      'index.ts': "import { arraify } from '@williamthorsen/toolbelt.arrays/candidate';",
    });

    expect(collectReachableModuleSet(path.join(tree.dir, 'index.ts'))).toStrictEqual(
      new Set([path.join(tree.dir, 'index.ts')]),
    );
  });

  it('reaches nothing from an entry that does not exist', () => {
    using tree = createTempDir({});

    expect(collectReachableModuleSet(path.join(tree.dir, 'index.ts'))).toStrictEqual(new Set());
  });
});
