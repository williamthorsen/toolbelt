import fs from 'node:fs';
import path from 'node:path';

import { findAsdfInstall } from '../3-candidate/findAsdfInstall.ts';
import { findExecutableOnPath } from '../3-candidate/findExecutableOnPath.ts';
import { findToolVersionsEntry, type ToolVersionsEntry } from '../3-candidate/findToolVersionsEntry.ts';
import { type AsdfShimProvider, parseAsdfShim } from '../3-candidate/parseAsdfShim.ts';
import { resolveNpmPackageOfBin } from '../3-candidate/resolveNpmPackageOfBin.ts';

const COMMAND = 'pnpm';
const COREPACK = 'corepack';
const HEADER_BYTES = 4_096;
const NODE_PLUGIN = 'nodejs';
const PNPM_PLUGIN = 'pnpm';

/**
 * Classifies the `pnpm` on PATH by what provides it, reading files and spawning nothing. A file whose header
 * declares asdf providers is a shim: one naming the `pnpm` plugin is the asdf plugin's, whatever else it names,
 * and one naming `nodejs` at the running node's version resolves through that install's bin symlink to corepack
 * or to an npm-global pnpm. A shim naming `nodejs` but not the running version, or found under a node that asdf
 * does not manage, is stranded. Outside a shim the bin symlink is read from the path itself, so a corepack or
 * npm-global pnpm under a node outside asdf is recognized too; anything else is named by path alone.
 *
 * @internal
 */
export function resolvePnpmProvider(options: ResolvePnpmProviderOptions): PnpmProvider {
  const { cwd, execPath, homeDir, pathDirs } = options;

  const pnpmPath = findExecutableOnPath(COMMAND, pathDirs);
  if (pnpmPath === undefined) return { kind: 'absent' };

  const providers = parseAsdfShim(readHeader(pnpmPath));
  if (providers.length === 0) return classifyBin(pnpmPath, resolveNpmPackageOfBin(pnpmPath), undefined);

  const pluginVersions = listVersions(providers, PNPM_PLUGIN);
  if (pluginVersions.length > 0) {
    const toolVersions = findToolVersionsEntry(PNPM_PLUGIN, { homeDir, startDir: cwd });

    return { kind: 'asdf-plugin', path: pnpmPath, toolVersions, versions: pluginVersions };
  }

  const nodeVersions = listVersions(providers, NODE_PLUGIN);
  if (nodeVersions.length === 0) return { kind: 'path', path: pnpmPath };

  const install = findAsdfInstall(execPath);
  if (install === undefined || install.plugin !== NODE_PLUGIN || !nodeVersions.includes(install.version)) {
    return { kind: 'stranded-shim', path: pnpmPath, providingVersions: nodeVersions };
  }

  const binPath = path.join(install.dataDir, 'installs', NODE_PLUGIN, install.version, 'bin', COMMAND);

  return classifyBin(pnpmPath, resolveNpmPackageOfBin(binPath), install.version);
}

/** What provides the `pnpm` on PATH. */
export type PnpmProvider =
  | { readonly kind: 'absent' }
  | {
      readonly kind: 'asdf-plugin';
      readonly path: string;
      /** The `.tool-versions` entry selecting the plugin's version from the working directory, where one is in reach. */
      readonly toolVersions: ToolVersionsEntry | undefined;
      /** The plugin versions that the shim's header names. */
      readonly versions: readonly string[];
    }
  | {
      readonly kind: 'corepack' | 'npm-global';
      /** The asdf nodejs version under which the bin was found, or `undefined` for a node outside asdf. */
      readonly nodeVersion: string | undefined;
      readonly path: string;
    }
  | { readonly kind: 'path'; readonly path: string }
  | {
      readonly kind: 'stranded-shim';
      readonly path: string;
      /** The nodejs versions that the shim's header names, none of them the running one. */
      readonly providingVersions: readonly string[];
    };

export interface ResolvePnpmProviderOptions {
  /** The directory from which a `.tool-versions` lookup ascends. */
  readonly cwd: string;
  /** The path of the node binary running the command, from which its asdf install is read. */
  readonly execPath: string;
  readonly homeDir: string;
  /** The directories of PATH, in search order. */
  readonly pathDirs: readonly string[];
}

// region | Helpers

/** Classifies a bin by the npm package behind it, falling back to the path where no known package is. */
function classifyBin(
  pnpmPath: string,
  backingPackage: string | undefined,
  nodeVersion: string | undefined,
): PnpmProvider {
  if (backingPackage === COREPACK) return { kind: 'corepack', nodeVersion, path: pnpmPath };
  if (backingPackage === COMMAND) return { kind: 'npm-global', nodeVersion, path: pnpmPath };

  return { kind: 'path', path: pnpmPath };
}

/** Lists the versions that a shim's providers name for one plugin, in header order. */
function listVersions(providers: readonly AsdfShimProvider[], plugin: string): string[] {
  return providers.filter((provider) => provider.plugin === plugin).map((provider) => provider.version);
}

/** Reads the start of a file, which is where a shim's header is; a standalone pnpm binary is too large to read whole. */
function readHeader(filePath: string): string {
  const buffer = Buffer.alloc(HEADER_BYTES);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, buffer, 0, HEADER_BYTES, 0);

    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    fs.closeSync(descriptor);
  }
}

// endregion | Helpers
