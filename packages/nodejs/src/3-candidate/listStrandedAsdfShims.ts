import fs from 'node:fs';
import path from 'node:path';

import { findExecutableOnPath } from './findExecutableOnPath.ts';
import { type AsdfShimProvider, parseAsdfShim } from './parseAsdfShim.ts';
import { resolveNpmPackageOfBin } from './resolveNpmPackageOfBin.ts';

/**
 * Lists the asdf shims of a plugin that a version of it does not provide: each shim under `<dataDir>/shims`
 * whose header names the plugin at least once and the version never. Such a shim stays on PATH and fails when
 * invoked under that version. A shim that an installed version of another plugin also provides is passed over:
 * asdf may resolve the command through that plugin, which depends on version selection that the filesystem
 * does not record. Each entry names the versions that do provide the command, the first other
 * provider on `pathDirs` outside the shims directory where there is one, and the npm package that installed
 * the command under the first providing version whose bin symlink resolves to one. A missing shims directory
 * yields an empty array, and the result is sorted by name.
 *
 * @category asdf
 * @experimental
 * @stage candidate
 */
export function listStrandedAsdfShims(options: ListStrandedAsdfShimsOptions): StrandedAsdfShim[] {
  const { dataDir, pathDirs, plugin, version } = options;
  const shimsDir = path.join(dataDir, 'shims');
  const stranded: StrandedAsdfShim[] = [];

  for (const name of listShimNames(shimsDir)) {
    const shimPath = path.join(shimsDir, name);
    const providers = parseAsdfShim(fs.readFileSync(shimPath, 'utf8'));
    const providingVersions = providers
      .filter((provider) => provider.plugin === plugin)
      .map((provider) => provider.version);

    if (providingVersions.length === 0 || providingVersions.includes(version)) continue;
    if (providers.some((provider) => provider.plugin !== plugin && isInstalled(dataDir, provider))) continue;

    stranded.push({
      backingPackage: findBackingPackage(dataDir, plugin, providingVersions, name),
      name,
      otherProvider: findExecutableOnPath(name, pathDirs, { excludeDir: shimsDir }),
      providingVersions,
      shimPath,
    });
  }

  return stranded.toSorted((left, right) => left.name.localeCompare(right.name));
}

export interface ListStrandedAsdfShimsOptions {
  /** The asdf data directory, which holds `shims/` and `installs/`. */
  readonly dataDir: string;
  /** The directories of PATH, in search order. */
  readonly pathDirs: readonly string[];
  readonly plugin: string;
  /** The version of the plugin against which a shim is judged: the active one. */
  readonly version: string;
}

/** A shim that the judged version does not provide. */
export interface StrandedAsdfShim {
  /** The npm package that installed the command, where a providing version's bin symlink resolves to one. */
  readonly backingPackage: string | undefined;
  readonly name: string;
  /** The first executable of the same name on PATH outside the shims directory, which the shim shadows. */
  readonly otherProvider: string | undefined;
  readonly providingVersions: readonly string[];
  readonly shimPath: string;
}

// region | Helpers

/** Resolves the npm package behind a command from the first providing version whose bin symlink names one. */
function findBackingPackage(
  dataDir: string,
  plugin: string,
  versions: readonly string[],
  name: string,
): string | undefined {
  for (const version of versions) {
    const backingPackage = resolveNpmPackageOfBin(path.join(dataDir, 'installs', plugin, version, 'bin', name));
    if (backingPackage !== undefined) return backingPackage;
  }

  return undefined;
}

/** Reports whether the install directory of a provider exists, which a stale header line's does not. */
function isInstalled(dataDir: string, provider: AsdfShimProvider): boolean {
  return fs.existsSync(path.join(dataDir, 'installs', provider.plugin, provider.version));
}

/** Lists the regular files directly under the shims directory, or nothing where the directory is absent. */
function listShimNames(shimsDir: string): string[] {
  try {
    return fs
      .readdirSync(shimsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch (error) {
    if (isMissingPathError(error)) return [];
    throw error;
  }
}

/** Reports whether an error is node's report of a path that does not exist. */
function isMissingPathError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

// endregion | Helpers
