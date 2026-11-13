import { findNearestManifest, type PackageManifest } from '@williamthorsen/toolbelt.packaging/candidate';

/**
 * Finds the `packageManager` pin that governs a directory: the nearest `package.json` at or above it whose
 * `packageManager` is a string. A manifest without the field is passed over, so a workspace package under a
 * pinned root resolves to the root's pin. Returns the raw value with the manifest's location, both absolute,
 * leaving the parse to the caller, or `undefined` when no ancestor declares one. A manifest that is unreadable as
 * JSON, or that is not a JSON object, throws an error naming it.
 *
 * @category Package managers
 * @experimental
 * @stage candidate
 */
export function findPackageManagerPin(startDir: string): PackageManagerPin | undefined {
  const pinned = findNearestManifest(startDir, isPinnedManifest);
  if (pinned === undefined) return undefined;

  return { dir: pinned.packageDir, manifestPath: pinned.manifestPath, spec: pinned.manifest.packageManager };
}

/** A `packageManager` declaration and where it was found. */
export interface PackageManagerPin {
  /** The directory containing the manifest, which is where the pinned manager governs. */
  readonly dir: string;
  readonly manifestPath: string;
  /** The field's raw value, such as `pnpm@12.4.0`. */
  readonly spec: string;
}

// region | Helpers

/** Accepts a manifest whose `packageManager` is a string. */
function isPinnedManifest(manifest: PackageManifest): manifest is PackageManifest & { packageManager: string } {
  return typeof manifest['packageManager'] === 'string';
}

// endregion | Helpers
