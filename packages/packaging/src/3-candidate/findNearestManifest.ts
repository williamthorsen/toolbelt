import fs from 'node:fs';
import path from 'node:path';

import { listDirectoryChain } from '@williamthorsen/toolbelt.filesystem';
import { isRecord } from '@williamthorsen/toolbelt.objects';

/**
 * Finds the nearest `package.json` at or above `startDir` that `predicate` accepts, returning it with its location,
 * or `undefined` when no manifest in the chain is accepted.
 *
 * A manifest that the predicate rejects is passed over and the ascent continues. A manifest that is unreadable as
 * JSON, or that parses to something other than a JSON object, throws an error naming it whatever the predicate
 * would have said, so a corrupt manifest never resolves to an ancestor. A type-guard predicate narrows the returned
 * manifest.
 *
 * @example
 * findNearestManifest(process.cwd(), (manifest) => manifest['workspaces'] !== undefined);
 * // { manifest: { name: 'my-monorepo', workspaces: ['packages/*'] }, manifestPath: '/repo/package.json', packageDir: '/repo' }
 *
 * @category Packaging
 * @experimental
 * @stage candidate
 * @throws If a manifest in the chain is unreadable as JSON or is not a JSON object.
 */
export function findNearestManifest<T extends PackageManifest>(
  startDir: string,
  predicate: (manifest: PackageManifest) => manifest is T,
): NearestManifest<T> | undefined;
export function findNearestManifest(
  startDir: string,
  predicate: (manifest: PackageManifest) => boolean,
): NearestManifest | undefined;
export function findNearestManifest(
  startDir: string,
  predicate: (manifest: PackageManifest) => boolean,
): NearestManifest | undefined {
  for (const dir of listDirectoryChain(startDir)) {
    const manifestPath = path.join(dir, 'package.json');

    if (!fs.existsSync(manifestPath)) continue;

    const manifest = readManifest(manifestPath);

    if (predicate(manifest)) {
      return { manifest, manifestPath, packageDir: dir };
    }
  }

  return undefined;
}

/** A manifest found by `findNearestManifest`, with the paths of the file and of the directory containing it. */
export interface NearestManifest<T extends PackageManifest = PackageManifest> {
  readonly manifest: T;
  readonly manifestPath: string;
  readonly packageDir: string;
}

/** A parsed `package.json`. Every field is `unknown`, since a manifest is untrusted JSON. */
export type PackageManifest = Readonly<Record<string, unknown>>;

// region | Helpers
/**
 * Narrows parsed JSON to a manifest shape, which is any JSON object: Every field is optional.
 *
 * Arrays are excluded: An array admitted here would be passed to the predicate as an empty manifest, making a
 * malformed manifest resolve to an ancestor instead of raising.
 */
function isPackageManifest(value: unknown): value is PackageManifest {
  return isRecord(value);
}

/** Reads and parses a manifest, rejecting one that is unreadable as JSON or is not a JSON object. */
function readManifest(manifestPath: string): PackageManifest {
  let parsed: unknown;

  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Package manifest is not readable as JSON: ${manifestPath}`, { cause: error });
  }

  if (!isPackageManifest(parsed)) {
    throw new Error(`Package manifest is not a JSON object: ${manifestPath}`);
  }

  return parsed;
}
// endregion | Helpers
