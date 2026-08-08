import { describe, expect, it } from 'vitest';

import { createTempTree } from '../../1-proposed/createTempTree.ts';
import { loadConfigCascade } from '../loadConfigCascade.ts';

/** A module that fails loudly if it is ever imported, proving the loader skipped it rather than discarded it. */
const POISONED_MODULE = "throw new Error('imported a config the cascade should have skipped');\n";

interface LabelledConfig {
  level: string;
}

describe(loadConfigCascade, () => {
  it('returns the configs from the start directory to the project root, nearest first', async () => {
    using tree = createTempTree({
      '.git/': '',
      'packages/app/stack.config.mjs': exportDefault({ level: 'app' }),
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      startDir: tree.resolve('packages/app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app', 'root']);
    expect(result.entries.map((entry) => entry.dir)).toStrictEqual([tree.resolve('packages/app'), tree.dir]);
    expect(result.projectRoot).toStrictEqual({ marker: '.git', rootDir: tree.dir, source: 'marker' });
    expect(result.stopReason).toBe('project-root');
  });

  it('never reads a config above the project root', async () => {
    using tree = createTempTree({
      'project/.git/': '',
      'project/stack.config.mjs': exportDefault({ level: 'project' }),
      'stack.config.mjs': POISONED_MODULE,
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      startDir: tree.resolve('project'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['project']);
  });

  it('once the stop predicate returns true, imports no farther config', async () => {
    using tree = createTempTree({
      '.git/': '',
      'app/stack.config.mjs': exportDefault({ level: 'app', shouldStopAscent: true }),
      'stack.config.mjs': POISONED_MODULE,
    });

    const result = await loadConfigCascade<LabelledConfig & { shouldStopAscent?: boolean }>({
      fileNames: ['stack.config.mjs'],
      shouldStopAscent: (config) => config.shouldStopAscent === true,
      startDir: tree.resolve('app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app']);
    expect(result.stopReason).toBe('predicate');
  });

  it('if the stop predicate never returns true, ascends to the project root', async () => {
    using tree = createTempTree({
      '.git/': '',
      'app/stack.config.mjs': exportDefault({ level: 'app' }),
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      shouldStopAscent: () => false,
      startDir: tree.resolve('app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app', 'root']);
    expect(result.stopReason).toBe('project-root');
  });

  it('given several file names, takes the earliest match at each level independently', async () => {
    using tree = createTempTree({
      '.git/': '',
      'app/primary.config.mjs': exportDefault({ level: 'app-primary' }),
      'app/secondary.config.mjs': POISONED_MODULE,
      'secondary.config.mjs': exportDefault({ level: 'root-secondary' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['primary.config.mjs', 'secondary.config.mjs'],
      startDir: tree.resolve('app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app-primary', 'root-secondary']);
  });

  it('given a nested file name, reports the cascade level rather than the file’s own directory', async () => {
    using tree = createTempTree({
      '.git/': '',
      'app/.config/stack.config.mjs': exportDefault({ level: 'app' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['.config/stack.config.mjs'],
      startDir: tree.resolve('app'),
    });

    expect(result.entries.map((entry) => entry.dir)).toStrictEqual([tree.resolve('app')]);
    expect(result.entries.map((entry) => entry.filePath)).toStrictEqual([tree.resolve('app/.config/stack.config.mjs')]);
  });

  it('given a marker list, bounds the ascent by those markers', async () => {
    using tree = createTempTree({
      'app/.git/': '',
      'app/stack.config.mjs': exportDefault({ level: 'app' }),
      'deno.json': '{}',
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      markers: ['deno.json'],
      startDir: tree.resolve('app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app', 'root']);
    expect(result.projectRoot.marker).toBe('deno.json');
  });

  it('if no level holds a config, returns no entries', async () => {
    using tree = createTempTree({ '.git/': '', 'app/': '' });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      startDir: tree.resolve('app'),
    });

    expect(result.entries).toStrictEqual([]);
    expect(result.stopReason).toBe('project-root');
  });

  it('rejects a config module that has no default export', async () => {
    using tree = createTempTree({
      '.git/': '',
      'stack.config.mjs': 'export const config = { level: "root" };\n',
    });

    const resultPromise = loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.mjs'],
      startDir: tree.dir,
    });

    await expect(resultPromise).rejects.toThrow(/has no default export/);
  });

  it('rejects a file name that would ascend above its level', async () => {
    using tree = createTempTree({
      'project/.git/': '',
      'shared.config.mjs': POISONED_MODULE,
    });

    const resultPromise = loadConfigCascade<LabelledConfig>({
      fileNames: ['../shared.config.mjs'],
      startDir: tree.resolve('project'),
    });

    await expect(resultPromise).rejects.toThrow(/must not ascend above its directory level/);
  });

  it('rejects an absolute file name', async () => {
    using tree = createTempTree({
      '.git/': '',
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const resultPromise = loadConfigCascade<LabelledConfig>({
      fileNames: [tree.resolve('stack.config.mjs')],
      startDir: tree.dir,
    });

    await expect(resultPromise).rejects.toThrow(/must be relative to its directory level/);
  });

  it('given `..` segments that resolve back within the level, loads the config', async () => {
    using tree = createTempTree({
      '.git/': '',
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['nested/../stack.config.mjs'],
      startDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['root']);
  });

  it('loads a TypeScript config module', async () => {
    using tree = createTempTree({
      '.git/': '',
      'stack.config.ts': 'const config: { level: string } = { level: "root" };\nexport default config;\n',
    });

    const result = await loadConfigCascade<LabelledConfig>({
      fileNames: ['stack.config.ts'],
      startDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['root']);
  });
});

/** Renders a module whose default export is the given value. */
function exportDefault(value: unknown): string {
  return `export default ${JSON.stringify(value)};\n`;
}
