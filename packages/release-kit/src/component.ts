import type { ComponentConfig } from './types.ts';

/**
 * Creates a component configuration from a package directory name.
 *
 * Derives all fields from the single directory name so that the same rule governs both tag creation and tag lookup.
 *
 * @param dir - The package directory name (e.g., 'basic'). Assumed to be under `packages/`.
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
