import { findOwningManifest } from './findOwningManifest.ts';

/**
 * Reads the version declared by the package owning this module, which is this package's own whether it runs
 * from source under the test runner or from the build output once installed.
 *
 * @internal
 */
export function resolveSelfVersion(): string {
  const { manifest, manifestPath } = findOwningManifest(import.meta.dirname);

  if (typeof manifest.version !== 'string') {
    throw new TypeError(`No version declared in the package manifest at ${manifestPath}.`);
  }

  return manifest.version;
}
