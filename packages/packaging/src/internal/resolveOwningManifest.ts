import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listDirectoryChain } from '@williamthorsen/toolbelt.filesystem';

/**
 * Returns the manifest of the package that owns the module at `fromUrl`, together with where it was found.
 *
 * Ascends from the module's own directory and answers with the first `package.json` declaring a `name`. One
 * that declares none is a marker manifest, such as the `{"type": "commonjs"}` file a dual-format build leaves
 * in `dist/`, and the ascent passes over it. That is the whole difference from `node:module`'s
 * `findPackageJSON`, which answers with the nearest manifest whatever it holds.
 *
 * The chain is walked one level at a time rather than collected up front, so no directory above the owning
 * package is ever probed.
 */
export function resolveOwningManifest(fromUrl: string): OwningManifest {
  const startDir = path.dirname(fileURLToPath(fromUrl));

  for (const dir of listDirectoryChain(startDir)) {
    const manifestPath = path.join(dir, 'package.json');

    if (!fs.existsSync(manifestPath)) continue;

    const manifest = readManifest(manifestPath);

    if (typeof manifest.name === 'string') {
      return { manifest, manifestPath, packageDir: dir };
    }
  }

  throw new Error(`No package.json declaring a name was found at or above: ${fromUrl}`);
}

export interface OwningManifest {
  manifest: PackageManifest;
  manifestPath: string;
  packageDir: string;
}

/** Only the fields this package reads are declared, and each as `unknown`, since a manifest is untrusted JSON. */
export interface PackageManifest {
  name?: unknown;
  version?: unknown;
}

// region | Helpers
/** Narrows parsed JSON to a manifest shape, which is any object: every declared field is optional. */
function isPackageManifest(value: unknown): value is PackageManifest {
  return typeof value === 'object' && value !== null;
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
