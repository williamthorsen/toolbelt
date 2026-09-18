import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { findToolVersionsEntry } from '../findToolVersionsEntry.ts';

describe(findToolVersionsEntry, () => {
  it('returns the nearest entry, taking the first version and ignoring a fallback', () => {
    using tree = createTempTree({
      'home/.tool-versions': 'pnpm 9.0.0\n',
      'home/repo/.tool-versions': 'nodejs 24.20.0\npnpm 10.15.0 9.0.0\n',
      'home/repo/packages/lib/.keep': '',
    });

    expect(findToolVersionsEntry('pnpm', buildOptions(tree.resolve('home/repo/packages/lib'), tree))).toStrictEqual({
      filePath: tree.resolve('home/repo/.tool-versions'),
      version: '10.15.0',
    });
  });

  it('falls back to the home file where the ascent passes outside it', () => {
    using tree = createTempTree({
      'home/.tool-versions': 'pnpm 9.0.0\n',
      'elsewhere/repo/.tool-versions': 'nodejs 24.20.0\n',
    });

    expect(findToolVersionsEntry('pnpm', buildOptions(tree.resolve('elsewhere/repo'), tree))).toStrictEqual({
      filePath: tree.resolve('home/.tool-versions'),
      version: '9.0.0',
    });
  });

  it('ignores a commented-out line and a line with no version', () => {
    using tree = createTempTree({ 'home/repo/.tool-versions': '# pnpm 9.0.0\npnpm   # no version\nnodejs 24.20.0\n' });

    expect(findToolVersionsEntry('pnpm', buildOptions(tree.resolve('home/repo'), tree))).toBeUndefined();
  });

  it('drops a trailing comment from a matching line', () => {
    using tree = createTempTree({ 'home/repo/.tool-versions': 'pnpm 9.0.0 # pinned\n' });

    expect(findToolVersionsEntry('pnpm', buildOptions(tree.resolve('home/repo'), tree))?.version).toBe('9.0.0');
  });

  it('returns undefined where no file in reach names the plugin', () => {
    using tree = createTempTree({ 'home/repo/.tool-versions': 'nodejs 24.20.0\n' });

    expect(findToolVersionsEntry('pnpm', buildOptions(tree.resolve('home/repo'), tree))).toBeUndefined();
  });
});

// region | Helpers

/** Builds options whose home is the tree's `home` directory. */
function buildOptions(startDir: string, tree: { resolve(entryPath: string): string }) {
  return { homeDir: tree.resolve('home'), startDir };
}

// endregion | Helpers
