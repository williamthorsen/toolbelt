import { pathToFileURL } from 'node:url';

import { listDirectoryChainMatches } from './directory-chain-matches.ts';
import { findProjectRoot, type ProjectRoot } from './findProjectRoot.ts';

/**
 * Loads every config file between a starting directory and its project root, nearest first.
 *
 * At each level from `startDir` up to and including the project root, the first of `fileNames` that exists
 * is taken as that level's config; levels holding none contribute nothing. The matched files are then
 * imported one at a time, nearest first, and `shouldStopAscent` is consulted after each: once it returns
 * true, the ascent halts and no farther file is imported. Nothing above the project root is ever read:
 * each name must stay within the level it is probed against, so one that escapes is rejected up front.
 *
 * Each config is the module's default export; validating its contents is the caller's job.
 *
 * @example
 * const { entries } = await loadConfigCascade({
 *   fileNames: ['stack.config.mjs'],
 *   shouldStopAscent: (config) => config.shouldStopAscent === true,
 *   startDir: process.cwd(),
 * });
 *
 * @category Filesystem
 * @stage release
 * @throws If a file name or marker is absolute or escapes its level, or if a matched file has no default export.
 */
export async function loadConfigCascade<TConfig = unknown>(
  options: LoadConfigCascadeOptions<TConfig>,
): Promise<ConfigCascade<TConfig>> {
  const { fileNames, markers, shouldStopAscent, startDir } = options;

  const projectRoot = findProjectRoot(startDir, { markers });
  const matches = listDirectoryChainMatches(startDir, fileNames, { stopAtDir: projectRoot.rootDir });

  const entries: ConfigEntry<TConfig>[] = [];
  let stopReason: CascadeStopReason = 'project-root';

  for (const { dir, entryPath } of matches) {
    // Sequential by design: the predicate decides whether the next file is imported at all.
    const config = await importDefaultExport<TConfig>(entryPath);
    entries.push({ config, dir, filePath: entryPath });

    if (shouldStopAscent?.(config) === true) {
      stopReason = 'predicate';
      break;
    }
  }

  return { entries, projectRoot, stopReason };
}

export type CascadeStopReason = 'predicate' | 'project-root';

export interface ConfigCascade<TConfig> {
  /** Ordered nearest first, starting at `startDir`. */
  entries: ConfigEntry<TConfig>[];
  projectRoot: ProjectRoot;
  stopReason: CascadeStopReason;
}

export interface ConfigEntry<TConfig> {
  config: TConfig;
  /** The cascade level the file was found at, which differs from the file's own directory when `fileNames` holds a nested path. */
  dir: string;
  filePath: string;
}

export interface LoadConfigCascadeOptions<TConfig> {
  /**
   * Paths relative to each level, in precedence order; the first that exists at a level is that level's config.
   * A name that leaves its level (an absolute path, or one whose `..` segments escape it) is rejected, since
   * it would read outside the bounds the cascade exists to enforce.
   */
  fileNames: ReadonlyArray<string>;
  /** Forwarded to `findProjectRoot` to bound the ascent. */
  markers?: ReadonlyArray<string> | undefined;
  /** Called after each config is loaded; returning true halts the ascent before the next import. */
  shouldStopAscent?: ((config: TConfig) => boolean) | undefined;
  startDir: string;
}

// region | Helpers
/**
 * Imports a config module and returns its default export, rejecting a module that declares none.
 */
async function importDefaultExport<TConfig>(filePath: string): Promise<TConfig> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- a dynamic import is typed `any`
  const configModule: ConfigModule<TConfig> = await import(pathToFileURL(filePath).href);

  if (!('default' in configModule)) {
    throw new Error(`Config file has no default export: ${filePath}`);
  }

  return configModule.default;
}

interface ConfigModule<TConfig> {
  /**
   * Optional because a module is free to declare no default export, which is the case the guard above rejects.
   * No runtime check can confirm the declared type; validating the config's contents stays with the caller.
   */
  default?: TConfig;
}
// endregion | Helpers
