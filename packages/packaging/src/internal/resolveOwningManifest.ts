import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listDirectoryChain } from '@williamthorsen/toolbelt.filesystem';

/**
 * Returns the manifest of the package that owns the module at `fromUrl`, together with where it was found.
 *
 * Ascends from the module's own directory and returns the first `package.json` declaring a `name`. One that
 * declares none is a marker manifest, such as the `{"type": "commonjs"}` file left in `dist/` by a dual-format
 * build, and the ascent passes over it. That is the whole difference from `node:module`'s `findPackageJSON`,
 * which returns the nearest manifest whatever it holds.
 *
 * @internal
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

/** Only the fields read by this package are declared, and each as `unknown`, since a manifest is untrusted JSON. */
export interface PackageManifest {
  name?: unknown;
  version?: unknown;
}

// region | Helpers
/**
 * Narrows parsed JSON to a manifest shape, which is any JSON object: Every declared field is optional.
 *
 * Arrays are excluded explicitly, since `typeof` reports one as an object. An array admitted here would be
 * passed over as nameless, making a malformed manifest resolve to an ancestor instead of raising.
 */
function isPackageManifest(value: unknown): value is PackageManifest {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
