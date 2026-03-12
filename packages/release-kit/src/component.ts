import type { ComponentConfig } from './types.ts';

/**
 * Creates a component configuration from a package directory name.
 *
 * Derives all fields from the single directory name so that the same rule governs both tag creation and tag lookup.
 *
 * Note: This function assumes the workspace lives under `packages/`. All generated paths
 * (`packageFiles`, `changelogPaths`, `paths`) use `packages/${dir}/...` as the base.
 *
 * @param dir - The package directory name (e.g., 'basic'). Must be non-empty.
 * @param tagPrefix - Optional custom tag prefix. Defaults to `${dir}-v`.
 */
export function component(dir: string, tagPrefix?: string): ComponentConfig {
  const prefix = tagPrefix ?? `${dir}-v`;
  return {
    tagPrefix: prefix,
    packageFiles: [`packages/${dir}/package.json`],
    changelogPaths: [`packages/${dir}`],
    paths: [`packages/${dir}/**`],
  };
}
