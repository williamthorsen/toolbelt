import { existsSync } from 'node:fs';
import { basename } from 'node:path';

import { component } from './component.ts';
import { DEFAULT_VERSION_PATTERNS, DEFAULT_WORK_TYPES } from './defaults.ts';
import type { ComponentConfig, MonorepoReleaseConfig, ReleaseConfig, ReleaseKitConfig } from './types.ts';

/** The path where the consumer-facing config file is expected. */
export const CONFIG_FILE_PATH = '.config/release-kit.ts';

/**
 * Loads the config file at `.config/release-kit.ts` using jiti for TypeScript loading.
 *
 * @returns The raw config object, or `undefined` if the file does not exist.
 * @throws If the file exists but cannot be loaded or does not have a default export.
 */
export async function loadConfig(): Promise<unknown> {
  if (!existsSync(CONFIG_FILE_PATH)) {
    return undefined;
  }

  const { createJiti } = await import('jiti');
  const jiti = createJiti(import.meta.url);
  const configModule: Record<string, unknown> = await jiti.import(CONFIG_FILE_PATH);

  // Support both default export and named `config` export
  return configModule.default ?? configModule.config;
}

/**
 * Resolves a final monorepo config from discovered workspaces and an optional user config overlay.
 *
 * Merging rules:
 * - `components`: match overlay entries by `dir` against discovered list; `shouldExclude` removes;
 *   other fields override; unlisted packages keep defaults.
 * - `workTypes`: shallow merge — consumer entries override or add to defaults by key.
 * - `versionPatterns`: consumer value replaces defaults entirely.
 * - `formatCommand`, `cliffConfigPath`, `workspaceAliases`: consumer value wins.
 */
export function mergeMonorepoConfig(
  discoveredPaths: string[],
  userConfig: ReleaseKitConfig | undefined,
): MonorepoReleaseConfig {
  // Build default components from discovered paths
  let components: ComponentConfig[] = discoveredPaths.map((dirPath) => {
    const name = basename(dirPath);
    return component(name);
  });

  // Apply component overrides from user config
  if (userConfig?.components !== undefined) {
    const overrides = new Map(userConfig.components.map((c) => [c.dir, c]));

    components = components
      .filter((c) => {
        const name = c.tagPrefix.replace(/-v$/, '');
        const override = overrides.get(name);
        return override?.shouldExclude !== true;
      })
      .map((c) => {
        const name = c.tagPrefix.replace(/-v$/, '');
        const override = overrides.get(name);
        if (override?.tagPrefix !== undefined) {
          return component(name, override.tagPrefix);
        }
        return c;
      });
  }

  // Merge workTypes
  const workTypes =
    userConfig?.workTypes === undefined
      ? { ...DEFAULT_WORK_TYPES }
      : { ...DEFAULT_WORK_TYPES, ...userConfig.workTypes };

  // versionPatterns: consumer replaces entirely
  const versionPatterns =
    userConfig?.versionPatterns === undefined ? { ...DEFAULT_VERSION_PATTERNS } : { ...userConfig.versionPatterns };

  const result: MonorepoReleaseConfig = {
    components,
    workTypes,
    versionPatterns,
  };

  const formatCommand = userConfig?.formatCommand;
  if (formatCommand !== undefined) {
    result.formatCommand = formatCommand;
  }

  const cliffConfigPath = userConfig?.cliffConfigPath;
  if (cliffConfigPath !== undefined) {
    result.cliffConfigPath = cliffConfigPath;
  }

  const workspaceAliases = userConfig?.workspaceAliases;
  if (workspaceAliases !== undefined) {
    result.workspaceAliases = workspaceAliases;
  }

  return result;
}

/**
 * Resolves a final single-package config from an optional user config overlay.
 */
export function mergeSinglePackageConfig(userConfig: ReleaseKitConfig | undefined): ReleaseConfig {
  const workTypes =
    userConfig?.workTypes === undefined
      ? { ...DEFAULT_WORK_TYPES }
      : { ...DEFAULT_WORK_TYPES, ...userConfig.workTypes };

  const versionPatterns =
    userConfig?.versionPatterns === undefined ? { ...DEFAULT_VERSION_PATTERNS } : { ...userConfig.versionPatterns };

  const result: ReleaseConfig = {
    tagPrefix: 'v',
    packageFiles: ['package.json'],
    changelogPaths: ['.'],
    workTypes,
    versionPatterns,
  };

  const formatCommand = userConfig?.formatCommand;
  if (formatCommand !== undefined) {
    result.formatCommand = formatCommand;
  }

  const cliffConfigPath = userConfig?.cliffConfigPath;
  if (cliffConfigPath !== undefined) {
    result.cliffConfigPath = cliffConfigPath;
  }

  const workspaceAliases = userConfig?.workspaceAliases;
  if (workspaceAliases !== undefined) {
    result.workspaceAliases = workspaceAliases;
  }

  return result;
}
