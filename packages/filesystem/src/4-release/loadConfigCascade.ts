import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
 * @throws If a file name is absolute or escapes its level, or if a matched file has no default export.
 */
export async function loadConfigCascade<TConfig = unknown>(
  options: LoadConfigCascadeOptions<TConfig>,
): Promise<ConfigCascade<TConfig>> {
  const { fileNames, markers, shouldStopAscent, startDir } = options;

  assertLevelRelativeFileNames(fileNames);

  const projectRoot = findProjectRoot(startDir, { markers });
  const candidates = collectCandidates(path.resolve(startDir), projectRoot.rootDir, fileNames);

  const entries: ConfigEntry<TConfig>[] = [];
  let stopReason: CascadeStopReason = 'project-root';

  for (const { dir, filePath } of candidates) {
    // Sequential by design: the predicate decides whether the next file is imported at all.
    const config = await importDefaultExport<TConfig>(filePath);
    entries.push({ config, dir, filePath });

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

interface CascadeCandidate {
  dir: string;
  filePath: string;
}

/**
 * Rejects any file name that would resolve outside the level it is probed against, which is what keeps
 * "nothing above the project root is ever read" true for a caller-supplied name rather than merely intended.
 * Validated once against the names themselves, so the rejection does not depend on what happens to exist on disk.
 */
function assertLevelRelativeFileNames(fileNames: ReadonlyArray<string>): void {
  for (const fileName of fileNames) {
    if (path.isAbsolute(fileName)) {
      throw new Error(`Config file name must be relative to its directory level: ${fileName}`);
    }

    // Normalizing first collapses interior `..` segments, so only a name that truly escapes is left leading with one.
    const normalized = path.normalize(fileName);

    if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
      throw new Error(`Config file name must not ascend above its directory level: ${fileName}`);
    }
  }
}

/**
 * Returns the config file matched at each level from `startDir` up to and including `rootDir`, nearest first.
 */
function collectCandidates(startDir: string, rootDir: string, fileNames: ReadonlyArray<string>): CascadeCandidate[] {
  const candidates: CascadeCandidate[] = [];

  let dir = startDir;
  let previousDir = '';

  // `rootDir` is always at or above `startDir`, so the ascent stops there; comparing against the previous
  // directory is the backstop that keeps a caller-supplied pair from walking past the filesystem root.
  while (dir !== previousDir) {
    for (const fileName of fileNames) {
      const filePath = path.join(dir, fileName);

      if (fs.existsSync(filePath)) {
        candidates.push({ dir, filePath });
        break;
      }
    }

    if (dir === rootDir) break;

    previousDir = dir;
    dir = path.dirname(dir);
  }

  return candidates;
}

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
