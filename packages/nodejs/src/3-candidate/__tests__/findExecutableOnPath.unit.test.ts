import fs from 'node:fs';

import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { findExecutableOnPath } from '../findExecutableOnPath.ts';

describe(findExecutableOnPath, () => {
  it('returns the first directory that holds an executable of that name', () => {
    using tree = createTempTree({ 'a/tool': '', 'b/tool': '' });
    fs.chmodSync(tree.resolve('a/tool'), 0o755);
    fs.chmodSync(tree.resolve('b/tool'), 0o755);

    expect(findExecutableOnPath('tool', [tree.resolve('a'), tree.resolve('b')])).toBe(tree.resolve('a/tool'));
  });

  it('passes over a file that is not executable', () => {
    using tree = createTempTree({ 'a/tool': '', 'b/tool': '' });
    fs.chmodSync(tree.resolve('a/tool'), 0o644);
    fs.chmodSync(tree.resolve('b/tool'), 0o755);

    expect(findExecutableOnPath('tool', [tree.resolve('a'), tree.resolve('b')])).toBe(tree.resolve('b/tool'));
  });

  it('passes over a directory of that name, an empty entry, and a directory that does not exist', () => {
    using tree = createTempTree({ 'a/tool/.keep': '', 'b/tool': '' });
    fs.chmodSync(tree.resolve('b/tool'), 0o755);

    const dirs = [tree.resolve('a'), '', tree.resolve('missing'), tree.resolve('b')];

    expect(findExecutableOnPath('tool', dirs)).toBe(tree.resolve('b/tool'));
  });

  it('excludes a directory by real path, so a symlink to it is excluded too', () => {
    using tree = createTempTree({ 'shims/tool': '', 'b/tool': '' });
    fs.chmodSync(tree.resolve('shims/tool'), 0o755);
    fs.chmodSync(tree.resolve('b/tool'), 0o755);
    fs.symlinkSync(tree.resolve('shims'), tree.resolve('shims-alias'));

    const dirs = [tree.resolve('shims-alias'), tree.resolve('b')];

    expect(findExecutableOnPath('tool', dirs, { excludeDir: tree.resolve('shims') })).toBe(tree.resolve('b/tool'));
  });

  it('returns undefined where no directory provides the executable', () => {
    using tree = createTempTree({ 'a/other': '' });

    expect(findExecutableOnPath('tool', [tree.resolve('a')])).toBeUndefined();
  });
});
