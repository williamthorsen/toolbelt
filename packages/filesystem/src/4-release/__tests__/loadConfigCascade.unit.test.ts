import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { type ConfigEntry, loadConfigCascade, type LoadConfigCascadeOptions } from '../loadConfigCascade.ts';

/** A module that fails loudly if it is ever imported, proving the loader skipped it rather than discarded it. */
const POISONED_MODULE = "throw new Error('imported a config that the cascade should have skipped');\n";

interface LabelledConfig {
  level: string;
  shouldStopAscent?: boolean;
}

describe(loadConfigCascade, () => {
  it('returns the configs from the start directory to the boundary, nearest first', async () => {
    using tree = createTempTree({
      'packages/app/stack.config.mjs': exportDefault({ level: 'app' }),
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('packages/app'),
      stopAtDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app', 'root']);
    expect(result.entries.map((entry) => entry.dir)).toStrictEqual([tree.resolve('packages/app'), tree.dir]);
    expect(result.stopReason).toBe('stop-dir');
  });

  it('never reads a config above the boundary', async () => {
    using tree = createTempTree({
      'project/stack.config.mjs': exportDefault({ level: 'project' }),
      'stack.config.mjs': POISONED_MODULE,
    });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('project'),
      stopAtDir: tree.resolve('project'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['project']);
  });

  it('given a boundary below the filesystem root, stops there rather than ascending past it', async () => {
    using tree = createTempTree({
      'app/nested/stack.config.mjs': exportDefault({ level: 'nested' }),
      'app/stack.config.mjs': exportDefault({ level: 'app' }),
      'stack.config.mjs': POISONED_MODULE,
    });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('app/nested'),
      stopAtDir: tree.resolve('app'),
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['nested', 'app']);
    expect(result.stopReason).toBe('stop-dir');
  });

  it('once the stop predicate returns true, imports no farther config', async () => {
    using tree = createTempTree({
      'app/stack.config.mjs': exportDefault({ level: 'app', shouldStopAscent: true }),
      'stack.config.mjs': POISONED_MODULE,
    });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      shouldStopAscent: (config) => config.shouldStopAscent === true,
      startDir: tree.resolve('app'),
      stopAtDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app']);
    expect(result.stopReason).toBe('predicate');
  });

  it('if the stop predicate never returns true, ascends to the boundary', async () => {
    using tree = createTempTree({
      'app/stack.config.mjs': exportDefault({ level: 'app' }),
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      shouldStopAscent: () => false,
      startDir: tree.resolve('app'),
      stopAtDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app', 'root']);
    expect(result.stopReason).toBe('stop-dir');
  });

  it('given several file names, takes the earliest match at each level independently', async () => {
    using tree = createTempTree({
      'app/primary.config.mjs': exportDefault({ level: 'app-primary' }),
      'app/secondary.config.mjs': POISONED_MODULE,
      'secondary.config.mjs': exportDefault({ level: 'root-secondary' }),
    });

    const result = await loadConfigCascade({
      fileNames: ['primary.config.mjs', 'secondary.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('app'),
      stopAtDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['app-primary', 'root-secondary']);
  });

  it('given a nested file name, reports the cascade level rather than the file’s own directory', async () => {
    using tree = createTempTree({
      'app/.config/stack.config.mjs': exportDefault({ level: 'app' }),
    });

    const result = await loadConfigCascade({
      fileNames: ['.config/stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('app'),
      stopAtDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.dir)).toStrictEqual([tree.resolve('app')]);
    expect(result.entries.map((entry) => entry.filePath)).toStrictEqual([tree.resolve('app/.config/stack.config.mjs')]);
  });

  it('if no level contains a config, returns no entries', async () => {
    using tree = createTempTree({ 'app/': '' });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('app'),
      stopAtDir: tree.dir,
    });

    expect(result.entries).toStrictEqual([]);
    expect(result.stopReason).toBe('stop-dir');
  });

  it('rejects a boundary that is neither the start directory nor one of its ancestors', async () => {
    using tree = createTempTree({ 'app/': '', 'sibling/': '' });

    const resultPromise = loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('app'),
      stopAtDir: tree.resolve('sibling'),
    });

    await expect(resultPromise).rejects.toThrow(/must be the start directory or one of its ancestors/);
  });

  it('rejects a config module that has no default export', async () => {
    using tree = createTempTree({
      'stack.config.mjs': 'export const config = { level: "root" };\n',
    });

    const resultPromise = loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.dir,
      stopAtDir: tree.dir,
    });

    await expect(resultPromise).rejects.toThrow(/has no default export/);
  });

  it('rejects a file name that would ascend above its level', async () => {
    using tree = createTempTree({
      'project/': '',
      'shared.config.mjs': POISONED_MODULE,
    });

    const resultPromise = loadConfigCascade({
      fileNames: ['../shared.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('project'),
      stopAtDir: tree.resolve('project'),
    });

    await expect(resultPromise).rejects.toThrow(/must not ascend above its directory level/);
  });

  it('rejects an absolute file name', async () => {
    using tree = createTempTree({
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const resultPromise = loadConfigCascade({
      fileNames: [tree.resolve('stack.config.mjs')],
      parseConfig: parseLabelledConfig,
      startDir: tree.dir,
      stopAtDir: tree.dir,
    });

    await expect(resultPromise).rejects.toThrow(/must be relative to its directory level/);
  });

  it('given `..` segments that resolve back within the level, loads the config', async () => {
    using tree = createTempTree({
      'stack.config.mjs': exportDefault({ level: 'root' }),
    });

    const result = await loadConfigCascade({
      fileNames: ['nested/../stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.dir,
      stopAtDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['root']);
  });

  it('loads a TypeScript config module', async () => {
    using tree = createTempTree({
      'stack.config.ts': 'const config: { level: string } = { level: "root" };\nexport default config;\n',
    });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.ts'],
      parseConfig: parseLabelledConfig,
      startDir: tree.dir,
      stopAtDir: tree.dir,
    });

    expect(result.entries.map((entry) => entry.config.level)).toStrictEqual(['root']);
  });

  it('records the value returned by the parser and passes it to the stop predicate', async () => {
    using tree = createTempTree({
      'stack.config.mjs': exportDefault({ name: 'root' }),
    });
    const seenByPredicate: unknown[] = [];

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: (value, filePath) => ({ filePath, raw: value }),
      shouldStopAscent: (config) => {
        seenByPredicate.push(config);
        return false;
      },
      startDir: tree.dir,
      stopAtDir: tree.dir,
    });

    const expected = { filePath: tree.resolve('stack.config.mjs'), raw: { name: 'root' } };
    expect(result.entries.map((entry) => entry.config)).toStrictEqual([expected]);
    expect(seenByPredicate).toStrictEqual([expected]);
  });

  it('if the parser throws, propagates its error and imports no farther config', async () => {
    using tree = createTempTree({
      'app/stack.config.mjs': exportDefault({ level: 42 }),
      'stack.config.mjs': POISONED_MODULE,
    });

    const resultPromise = loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('app'),
      stopAtDir: tree.dir,
    });

    await expect(resultPromise).rejects.toThrow(/Invalid config in .*app\/stack\.config\.mjs/);
  });

  it("infers the entries' config type from the parser", async () => {
    using tree = createTempTree({ 'app/': '' });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: parseLabelledConfig,
      startDir: tree.resolve('app'),
      stopAtDir: tree.dir,
    });

    expectTypeOf(result.entries).toEqualTypeOf<Array<ConfigEntry<LabelledConfig>>>();
  });

  it('given an identity parser, types each config as unknown', async () => {
    using tree = createTempTree({ 'app/': '' });

    const result = await loadConfigCascade({
      fileNames: ['stack.config.mjs'],
      parseConfig: (value) => value,
      startDir: tree.resolve('app'),
      stopAtDir: tree.dir,
    });

    expectTypeOf(result.entries).toEqualTypeOf<Array<ConfigEntry<unknown>>>();
  });

  it('requires a parser to declare a config type', () => {
    const optionsWithoutParser = { fileNames: ['stack.config.mjs'], startDir: '/app', stopAtDir: '/' };

    // @ts-expect-error -- a config type can come only from a parser
    expectTypeOf(optionsWithoutParser).toExtend<LoadConfigCascadeOptions<LabelledConfig>>();
  });
});

// region | Helpers
/** Renders a module whose default export is the given value. */
function exportDefault(value: unknown): string {
  return `export default ${JSON.stringify(value)};\n`;
}

/** Accepts a config whose `level` is a string, naming the file in the error otherwise. */
function parseLabelledConfig(value: unknown, filePath: string): LabelledConfig {
  if (typeof value !== 'object' || value === null || !('level' in value) || typeof value.level !== 'string') {
    throw new TypeError(`Invalid config in ${filePath}`);
  }
  const shouldStopAscent = 'shouldStopAscent' in value ? value.shouldStopAscent : undefined;
  return typeof shouldStopAscent === 'boolean' ? { level: value.level, shouldStopAscent } : { level: value.level };
}
// endregion | Helpers
