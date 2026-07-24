import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadConfigCascade } from '../loadConfigCascade.ts';
import { createTempTree, removeTempTrees } from './__fixtures__/createTempTree.ts';

/** A module that fails loudly if it is ever imported, proving the loader skipped it rather than discarded it. */
const POISONED_MODULE = "throw new Error('imported a config the cascade should have skipped');\n";

interface LabelledConfig {
  level: string;
}

describe(loadConfigCascade, () => {
  afterEach(removeTempTrees);

  it('returns the configs from the start directory to the project root, nearest first', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'packages/app/stack.config.mjs': exportDefault({ level: 'app' }),
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      startDir: path.join(treeDir, 'packages/app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app', 'root']);
    expect(result.entries.map((entry) => entry.dir)).toStrictEqual([path.join(treeDir, 'packages/app'), treeDir]);
    expect(result.projectRoot).toStrictEqual({ marker: '.git', rootDir: treeDir, source: 'marker' });
    expect(result.stopReason).toBe('project-root');
  });

  it('never reads a config above the project root', async () => {
    const treeDir = createTempTree({
      'project/.git/': '',
      'project/stack.config.mjs': exportDefault({ level: 'project' }),
      'stack.config.mjs': POISONED_MODULE,
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      startDir: path.join(treeDir, 'project'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['project']);
  });

  it('once the stop predicate returns true, imports no farther config', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'app/stack.config.mjs': exportDefault({ level: 'app', shouldStopAscent: true }),
      'stack.config.mjs': POISONED_MODULE,
    });

    const result = await loadConfigCascade<LabelledConfig & { shouldStopAscent?: boolean }>({
      fileNames: ['stack.config.mjs'],
      shouldStopAscent: (config) => config.shouldStopAscent === true,
      startDir: path.join(treeDir, 'app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app']);
    expect(result.stopReason).toBe('predicate');
  });

  it('if the stop predicate never returns true, ascends to the project root', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'app/stack.config.mjs': exportDefault({ level: 'app' }),
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      shouldStopAscent: () => false,
      startDir: path.join(treeDir, 'app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app', 'root']);
    expect(result.stopReason).toBe('project-root');
  });

  it('given several file names, takes the earliest match at each level independently', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'app/primary.config.mjs': exportDefault({ level: 'app-primary' }),
      'app/secondary.config.mjs': POISONED_MODULE,
      'secondary.config.mjs': exportDefault({ level: 'root-secondary' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['primary.config.mjs', 'secondary.config.mjs'],
      startDir: path.join(treeDir, 'app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app-primary', 'root-secondary']);
  });

  it('given a nested file name, reports the cascade level rather than the file’s own directory', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'app/.config/stack.config.mjs': exportDefault({ level: 'app' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['.config/stack.config.mjs'],
      startDir: path.join(treeDir, 'app'),
    });

    expect(result.entries.map((entry) => entry.dir)).toStrictEqual([path.join(treeDir, 'app')]);
    expect(result.entries.map((entry) => entry.filePath)).toStrictEqual([
      path.join(treeDir, 'app/.config/stack.config.mjs'),
    ]);
  });

  it('given a marker list, bounds the ascent by those markers', async () => {
    const treeDir = createTempTree({
      'app/.git/': '',
      'app/stack.config.mjs': exportDefault({ level: 'app' }),
      'deno.json': '{}',
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      markers: ['deno.json'],
      startDir: path.join(treeDir, 'app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app', 'root']);
    expect(result.projectRoot.marker).toBe('deno.json');
  });

  it('if no level holds a config, returns no entries', async () => {
    const treeDir = createTempTree({ '.git/': '', 'app/': '' });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      startDir: path.join(treeDir, 'app'),
    });

    expect(result.entries).toStrictEqual([]);
    expect(result.stopReason).toBe('project-root');
  });

  it('rejects a config module that has no default export', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'stack.config.mjs': 'export const config = { level: "root" };\n',
    });

    const resultPromise = loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      startDir: treeDir,
    });

    await expect(resultPromise).rejects.toThrow(/has no default export/);
  });

  it('rejects a file name that would ascend above its level', async () => {
    const treeDir = createTempTree({
      'project/.git/': '',
      'shared.config.mjs': POISONED_MODULE,
    });

    const resultPromise = loadConfigCascade<LabelledConfig>({
      fileNames: ['../shared.config.mjs'],
      startDir: path.join(treeDir, 'project'),
    });

    await expect(resultPromise).rejects.toThrow(/must not ascend above its directory level/);
  });

  it('rejects an absolute file name', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const resultPromise = loadConfigCascade<LabelledConfig>({
      fileNames: [path.join(treeDir, 'stack.config.mjs')],
      startDir: treeDir,
    });

    await expect(resultPromise).rejects.toThrow(/must be relative to its directory level/);
  });

  it('given `..` segments that resolve back within the level, loads the config', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['nested/../stack.config.mjs'],
      startDir: treeDir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['root']);
  });

  it('loads a TypeScript config module', async () => {
    const treeDir = createTempTree({
      '.git/': '',
      'stack.config.ts': 'const config: { level: string } = { level: "root" };\nexport default config;\n',
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.ts'],
      startDir: treeDir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['root']);
  });
});

/** Renders a module whose default export is the given value. */
function exportDefault(value: unknown): string {
  return `export default ${JSON.stringify(value)};\n`;
}
