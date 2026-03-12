import { describe, expect, it } from 'vitest';

import { DEFAULT_VERSION_PATTERNS, DEFAULT_WORK_TYPES } from '../defaults.ts';
import { mergeMonorepoConfig, mergeSinglePackageConfig } from '../loadConfig.ts';

describe(mergeMonorepoConfig, () => {
  const discoveredPaths = ['packages/arrays', 'packages/strings'];

  it('builds default components from discovered paths', () => {
    const result = mergeMonorepoConfig(discoveredPaths, undefined);

    expect(result.components).toHaveLength(2);
    expect(result.components[0]).toStrictEqual({
      tagPrefix: 'arrays-v',
      packageFiles: ['packages/arrays/package.json'],
      changelogPaths: ['packages/arrays'],
      paths: ['packages/arrays/**'],
    });
  });

  it('uses default workTypes when no config is provided', () => {
    const result = mergeMonorepoConfig(discoveredPaths, undefined);
    expect(result.workTypes).toStrictEqual(DEFAULT_WORK_TYPES);
  });

  it('uses default versionPatterns when no config is provided', () => {
    const result = mergeMonorepoConfig(discoveredPaths, undefined);
    expect(result.versionPatterns).toStrictEqual(DEFAULT_VERSION_PATTERNS);
  });

  it('excludes components with shouldExclude', () => {
    const result = mergeMonorepoConfig(discoveredPaths, {
      components: [{ dir: 'strings', shouldExclude: true }],
    });

    expect(result.components).toHaveLength(1);
    expect(result.components[0]?.tagPrefix).toBe('arrays-v');
  });

  it('applies tagPrefix override to a matched component', () => {
    const result = mergeMonorepoConfig(discoveredPaths, {
      components: [{ dir: 'arrays', tagPrefix: 'my-arrays-v' }],
    });

    expect(result.components[0]?.tagPrefix).toBe('my-arrays-v');
  });

  it('merges custom workTypes with defaults', () => {
    const result = mergeMonorepoConfig(discoveredPaths, {
      workTypes: { perf: { header: 'Performance' } },
    });

    expect(result.workTypes?.perf).toStrictEqual({ header: 'Performance' });
    expect(result.workTypes?.fix).toStrictEqual(DEFAULT_WORK_TYPES.fix);
  });

  it('replaces versionPatterns entirely when provided', () => {
    const customPatterns = { major: ['!', 'breaking'], minor: ['feat', 'perf'] };
    const result = mergeMonorepoConfig(discoveredPaths, {
      versionPatterns: customPatterns,
    });

    expect(result.versionPatterns).toStrictEqual(customPatterns);
  });

  it('passes through formatCommand from config', () => {
    const result = mergeMonorepoConfig(discoveredPaths, {
      formatCommand: 'pnpm run fmt',
    });

    expect(result.formatCommand).toBe('pnpm run fmt');
  });

  it('passes through cliffConfigPath from config', () => {
    const result = mergeMonorepoConfig(discoveredPaths, {
      cliffConfigPath: 'custom/cliff.toml',
    });

    expect(result.cliffConfigPath).toBe('custom/cliff.toml');
  });

  it('passes through workspaceAliases from config', () => {
    const result = mergeMonorepoConfig(discoveredPaths, {
      workspaceAliases: { api: 'backend-api' },
    });

    expect(result.workspaceAliases).toStrictEqual({ api: 'backend-api' });
  });
});

describe(mergeSinglePackageConfig, () => {
  it('returns defaults when no config is provided', () => {
    const result = mergeSinglePackageConfig(undefined);

    expect(result.tagPrefix).toBe('v');
    expect(result.packageFiles).toStrictEqual(['package.json']);
    expect(result.changelogPaths).toStrictEqual(['.']);
    expect(result.workTypes).toStrictEqual(DEFAULT_WORK_TYPES);
    expect(result.versionPatterns).toStrictEqual(DEFAULT_VERSION_PATTERNS);
  });

  it('merges custom workTypes with defaults', () => {
    const result = mergeSinglePackageConfig({
      workTypes: { perf: { header: 'Performance' } },
    });

    expect(result.workTypes?.perf).toStrictEqual({ header: 'Performance' });
    expect(result.workTypes?.fix).toStrictEqual(DEFAULT_WORK_TYPES.fix);
  });

  it('replaces versionPatterns entirely when provided', () => {
    const customPatterns = { major: ['!'], minor: ['feat', 'perf'] };
    const result = mergeSinglePackageConfig({ versionPatterns: customPatterns });

    expect(result.versionPatterns).toStrictEqual(customPatterns);
  });

  it('passes through scalar overrides', () => {
    const result = mergeSinglePackageConfig({
      formatCommand: 'pnpm run fmt',
      cliffConfigPath: 'custom/cliff.toml',
      workspaceAliases: { api: 'backend-api' },
    });

    expect(result.formatCommand).toBe('pnpm run fmt');
    expect(result.cliffConfigPath).toBe('custom/cliff.toml');
    expect(result.workspaceAliases).toStrictEqual({ api: 'backend-api' });
  });
});
