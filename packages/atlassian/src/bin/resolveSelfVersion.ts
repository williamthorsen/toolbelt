import { findOwningManifest } from './findOwningManifest.ts';

/**
 * Reads the version declared by the package owning a directory, defaulting to this module's own, which is
 * this package whether it runs from source under the test runner or from the build output once installed.
 * Throws where the owning manifest declares no string version.
 *
 * @internal
 */
export function resolveSelfVersion(fromDir: string = import.meta.dirname): string {
  const { manifest, manifestPath } = findOwningManifest(fromDir);

  if (typeof manifest.version !== 'string') {
    throw new TypeError(`No version declared in the package manifest at ${manifestPath}.`);
  }

  return manifest.version;
}
