import { resolveOwningManifest } from '../internal/resolveOwningManifest.ts';

/**
 * Returns the directory of the package that owns the module at `fromUrl`, which is where assets shipped
 * alongside that package resolve from.
 *
 * The owning package is the nearest ancestor whose `package.json` declares a `name`, so a marker manifest --
 * the `{"type": "commonjs"}` file left in `dist/` by a dual-format build -- is passed over rather than
 * returned. Pass `import.meta.url`: A module's own URL is the only input that resolves correctly from both a
 * source tree and a compiled one, where the two sit at different depths.
 *
 * A module belonging to no package is an error rather than a fallback, so the return is a bare directory.
 *
 * @example
 * findPackageRoot(import.meta.url); // '/home/dev/my-app/node_modules/some-package'
 *
 * @category Packaging
 * @experimental
 * @stage candidate
 * @throws If no ancestor manifest declares a name, or if one is unreadable as JSON.
 */
export function findPackageRoot(fromUrl: string): string {
  return resolveOwningManifest(fromUrl).packageDir;
}
