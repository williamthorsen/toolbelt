import { resolveOwningManifest } from '../internal/resolveOwningManifest.ts';

/**
 * Returns the version declared by the package that owns the module at `fromUrl`.
 *
 * Pass `import.meta.url`, which reports the same version from a source tree and a compiled one even though
 * the two sit at different depths. A manifest declaring a `name` but no string `version` raises rather than
 * letting the ascent continue, so a versionless package never reports an ancestor's version as its own.
 *
 * @example
 * getSelfVersion(import.meta.url); // '1.4.2'
 *
 * @category Packaging
 * @experimental
 * @stage candidate
 * @throws If the owning manifest declares no string version, if no ancestor manifest declares a name, or if
 * one is unreadable as JSON.
 */
export function getSelfVersion(fromUrl: string): string {
  const { manifest, manifestPath } = resolveOwningManifest(fromUrl);

  if (typeof manifest.version !== 'string') {
    throw new TypeError(`Package manifest declares no string version: ${manifestPath}`);
  }

  return manifest.version;
}
