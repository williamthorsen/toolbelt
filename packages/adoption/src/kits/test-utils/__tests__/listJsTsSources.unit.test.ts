import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { listJsTsSources } from '../listJsTsSources.ts';

describe(listJsTsSources, () => {
  it('keeps the JavaScript and TypeScript sources and drops every other file', () => {
    using tree = createTempDir({
      'a.ts': '',
      'b.mts': '',
      'c.cjs': '',
      'd.js': '',
      'e.tsx': '',
      'notes.md': '',
      'package.json': '',
    });

    const names = listJsTsSources([tree.dir]).map((file) => path.basename(file));

    expect(names.toSorted()).toStrictEqual(['a.ts', 'b.mts', 'c.cjs', 'd.js', 'e.tsx']);
  });

  it('concatenates the directories in the order given, as paths joined to each directory', () => {
    using tree = createTempDir({ 'first/one.ts': '', 'second/two.ts': '' });

    const first = path.join(tree.dir, 'first');
    const second = path.join(tree.dir, 'second');

    expect(listJsTsSources([second, first])).toStrictEqual([path.join(second, 'two.ts'), path.join(first, 'one.ts')]);
  });

  it('does not list the files of a nested directory', () => {
    using tree = createTempDir({ 'top.ts': '', 'nested/inner.ts': '' });

    expect(listJsTsSources([tree.dir])).toStrictEqual([path.join(tree.dir, 'top.ts')]);
  });
});
