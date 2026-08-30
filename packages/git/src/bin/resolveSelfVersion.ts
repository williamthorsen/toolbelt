import fs from 'node:fs';
import path from 'node:path';

/**
 * Reads the version from the nearest package manifest above this module, which is the package's own
 * whether it runs from source under the test runner or from the build output once installed.
 *
 * @internal
 */
export function resolveSelfVersion(): string {
  const manifestPath = findNearestManifest(import.meta.dirname);
  const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!isVersionedManifest(manifest)) {
    throw new Error(`No version declared in the package manifest at ${manifestPath}.`);
  }

  return manifest.version;
}

// region | Helpers

/** Walks up from a directory to the first ancestor holding a `package.json`. */
function findNearestManifest(startDir: string): string {
  let dir = startDir;

  for (;;) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`No package manifest above ${startDir}.`);

    dir = parent;
  }
}

/** Reports whether a parsed manifest carries a version string. */
function isVersionedManifest(value: unknown): value is { version: string } {
  return typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string';
}

// endregion | Helpers
