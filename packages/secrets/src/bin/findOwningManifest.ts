import fs from 'node:fs';
import path from 'node:path';

/**
 * Finds the manifest of the package owning a directory, ascending to the first `package.json` declaring a
 * `name`. One declaring none is a marker manifest, such as the `{"type": "commonjs"}` file a dual-format
 * build leaves in `dist/`, and the ascent passes over it, so the answer is the owning package rather than
 * the nearest manifest. Throws where no ancestor declares a name.
 *
 * @internal
 */
export function findOwningManifest(startDir: string): OwningManifest {
  let dir = startDir;

  for (;;) {
    const manifestPath = path.join(dir, 'package.json');

    if (fs.existsSync(manifestPath)) {
      const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (isNamedManifest(manifest)) return { manifest, manifestPath };
    }

    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`No package manifest declaring a name at or above ${startDir}.`);

    dir = parent;
  }
}

export interface OwningManifest {
  readonly manifest: { readonly version?: unknown };
  readonly manifestPath: string;
}

// region | Helpers

/** Reports whether parsed JSON is a manifest declaring a package name, which a marker manifest does not. */
function isNamedManifest(value: unknown): value is { version?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

// endregion | Helpers
