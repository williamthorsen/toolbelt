import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_ROOT_MARKERS, findProjectRoot } from '../findProjectRoot.ts';

const tempTrees: string[] = [];

describe(findProjectRoot, () => {
  afterEach(() => {
    for (const treeDir of tempTrees) {
      fs.rmSync(treeDir, { force: true, recursive: true });
    }
    tempTrees.length = 0;
  });

  it('returns the start directory when it carries a marker', () => {
    const treeDir = createTempTree(['.git/']);

    const result = findProjectRoot(treeDir);

    expect(result).toStrictEqual({ marker: '.git', rootDir: treeDir, source: 'marker' });
  });

  it('returns the nearest ancestor carrying a marker', () => {
    const treeDir = createTempTree(['pnpm-workspace.yaml', 'packages/app/src/']);

    const result = findProjectRoot(path.join(treeDir, 'packages/app/src'));

    expect(result).toStrictEqual({ marker: 'pnpm-workspace.yaml', rootDir: treeDir, source: 'marker' });
  });

  it('matches `.git` when it is a file rather than a directory', () => {
    const treeDir = createTempTree(['.git', 'src/']);

    const result = findProjectRoot(path.join(treeDir, 'src'));

    expect(result).toStrictEqual({ marker: '.git', rootDir: treeDir, source: 'marker' });
  });

  it('reports the earliest matching marker when a directory carries several', () => {
    const treeDir = createTempTree(['yarn.lock', 'pnpm-workspace.yaml']);

    const result = findProjectRoot(treeDir);

    expect(result.marker).toBe('pnpm-workspace.yaml');
  });

  it('resolves a relative start directory against the working directory', () => {
    const treeDir = createTempTree(['.git/', 'src/']);
    const relativeStartDir = path.relative(process.cwd(), path.join(treeDir, 'src'));

    const result = findProjectRoot(relativeStartDir);

    expect(result.rootDir).toBe(treeDir);
  });

  it('given a marker list, ignores the default markers', () => {
    const treeDir = createTempTree(['deno.json', 'app/.git/']);

    const result = findProjectRoot(path.join(treeDir, 'app'), { markers: ['deno.json'] });

    expect(result).toStrictEqual({ marker: 'deno.json', rootDir: treeDir, source: 'marker' });
  });

  it('if no marker is found, falls back to the nearest directory holding a package.json', () => {
    const treeDir = createTempTree(['package.json', 'app/package.json', 'app/src/']);

    const result = findProjectRoot(path.join(treeDir, 'app/src'));

    expect(result).toStrictEqual({ marker: null, rootDir: path.join(treeDir, 'app'), source: 'package-json' });
  });

  it('if no marker or package.json is found, falls back to the start directory', () => {
    const treeDir = createTempTree(['app/src/']);

    const result = findProjectRoot(path.join(treeDir, 'app/src'));

    expect(result).toStrictEqual({ marker: null, rootDir: path.join(treeDir, 'app/src'), source: 'start-dir' });
  });
});

describe('DEFAULT_ROOT_MARKERS', () => {
  it('lists the root markers in precedence order', () => {
    expect(DEFAULT_ROOT_MARKERS).toStrictEqual([
      '.git',
      'pnpm-workspace.yaml',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      'bun.lock',
    ]);
  });
});

/**
 * Creates a throwaway directory tree and returns its real path. Each entry is created relative to the
 * tree root: one ending in `/` becomes a directory, and any other becomes an empty file.
 *
 * The path is realpath-resolved because `os.tmpdir()` is a symlink on macOS, whereas `findProjectRoot`
 * resolves without following symlinks.
 */
function createTempTree(entries: ReadonlyArray<string>): string {
  const treeDirPrefix = path.join(os.tmpdir(), 'toolbelt-filesystem-');
  const treeDir = fs.realpathSync(fs.mkdtempSync(treeDirPrefix));
  tempTrees.push(treeDir);

  for (const entry of entries) {
    const entryPath = path.join(treeDir, entry);

    if (entry.endsWith('/')) {
      fs.mkdirSync(entryPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(entryPath), { recursive: true });
      fs.writeFileSync(entryPath, '');
    }
  }

  return treeDir;
}
