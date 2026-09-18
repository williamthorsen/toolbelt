import fs from 'node:fs';
import path from 'node:path';

/**
 * Finds the `packageManager` pin that governs a directory: the nearest `package.json` at or above it whose
 * `packageManager` is a string. A manifest without the field is passed over, so a workspace package under a
 * pinned root resolves to the root's pin. Returns the raw value with the manifest's location, leaving the parse
 * to the caller, or `undefined` where no ancestor declares one. A manifest that is not valid JSON throws.
 *
 * @category Package managers
 * @experimental
 * @stage candidate
 */
export function findPackageManagerPin(startDir: string): PackageManagerPin | undefined {
  let dir = startDir;

  for (;;) {
    const manifestPath = path.join(dir, 'package.json');

    if (fs.existsSync(manifestPath)) {
      const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const spec = readPackageManager(manifest);
      if (spec !== undefined) return { dir, manifestPath, spec };
    }

    const parent = path.dirname(dir);
    if (parent === dir) return undefined;

    dir = parent;
  }
}

/** A `packageManager` declaration and where it was found. */
export interface PackageManagerPin {
  /** The directory holding the manifest, which is where the pinned manager governs. */
  readonly dir: string;
  readonly manifestPath: string;
  /** The field's raw value, such as `pnpm@12.4.0`. */
  readonly spec: string;
}

// region | Helpers

/** Reads the `packageManager` string out of parsed manifest JSON, or `undefined` where it declares none. */
function readPackageManager(manifest: unknown): string | undefined {
  if (typeof manifest !== 'object' || manifest === null || !('packageManager' in manifest)) return undefined;

  return typeof manifest.packageManager === 'string' ? manifest.packageManager : undefined;
}

// endregion | Helpers
