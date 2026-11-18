import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { listResolvedImports } from '../listResolvedImports.ts';

describe(listResolvedImports, () => {
  it('resolves a static, a side-effect, and a dynamic import', () => {
    using tree = createTempDir({
      'index.ts': ["export { a } from './a.ts';", "import './b.ts';", "const c = await import('./c.ts');"].join('\n'),
      'a.ts': '',
      'b.ts': '',
      'c.ts': '',
    });

    expect(listResolvedImports(path.join(tree.dir, 'index.ts'))).toStrictEqual([
      path.join(tree.dir, 'a.ts'),
      path.join(tree.dir, 'b.ts'),
      path.join(tree.dir, 'c.ts'),
    ]);
  });

  it('ignores a specifier naming another package', () => {
    using tree = createTempDir({
      'index.ts': "import { arraify } from '@williamthorsen/toolbelt.arrays/candidate';",
    });

    expect(listResolvedImports(path.join(tree.dir, 'index.ts'))).toStrictEqual([]);
  });

  it('drops a relative specifier that does not resolve', () => {
    using tree = createTempDir({
      'index.ts': "import { missing } from './missing.ts';",
    });

    expect(listResolvedImports(path.join(tree.dir, 'index.ts'))).toStrictEqual([]);
  });

  it('lists a target once per import', () => {
    using tree = createTempDir({
      'index.ts': ["import { a } from './a.ts';", "export { b } from './a.ts';"].join('\n'),
      'a.ts': '',
    });

    expect(listResolvedImports(path.join(tree.dir, 'index.ts'))).toStrictEqual([
      path.join(tree.dir, 'a.ts'),
      path.join(tree.dir, 'a.ts'),
    ]);
  });
});
