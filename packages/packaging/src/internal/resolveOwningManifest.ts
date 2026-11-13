import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findNearestManifest, type NearestManifest, type PackageManifest } from '../3-candidate/findNearestManifest.ts';

/**
 * Returns the manifest of the package that owns the module at `fromUrl`, together with where it was found.
 *
 * Ascends from the module's own directory and returns the first `package.json` declaring a `name`. One that
 * declares none is a marker manifest, such as the `{"type": "commonjs"}` file left in `dist/` by a dual-format
 * build, and the ascent passes over it. That is the whole difference from `node:module`'s `findPackageJSON`,
 * which returns the nearest manifest whatever it contains.
 *
 * @internal
 */
export function resolveOwningManifest(fromUrl: string): NearestManifest<NamedManifest> {
  const owning = findNearestManifest(path.dirname(fileURLToPath(fromUrl)), isNamedManifest);

  if (owning === undefined) {
    throw new Error(`No package.json declaring a name was found at or above: ${fromUrl}`);
  }

  return owning;
}

export type NamedManifest = PackageManifest & { readonly name: string };

// region | Helpers
/** Accepts a manifest whose `name` is a string. */
function isNamedManifest(manifest: PackageManifest): manifest is NamedManifest {
  return typeof manifest['name'] === 'string';
}
// endregion | Helpers
