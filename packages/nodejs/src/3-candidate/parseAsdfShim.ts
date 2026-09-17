const HEADER_PREFIX = '# asdf-plugin:';

/**
 * Parses the providers that an asdf shim declares in its header: each `# asdf-plugin: <plugin> <version>` line
 * names one, in file order. The rule is asdf's own: a header line is split on single spaces and counts only when
 * it has at least four segments, of which the third and fourth are taken. Any other line is ignored, so a file
 * with no header yields an empty array.
 *
 * @category asdf
 * @experimental
 * @stage candidate
 */
export function parseAsdfShim(contents: string): AsdfShimProvider[] {
  const providers: AsdfShimProvider[] = [];

  for (const line of contents.split('\n')) {
    if (!line.startsWith(HEADER_PREFIX)) continue;

    const segments = line.split(' ');
    const plugin = segments[2];
    const version = segments[3];
    if (plugin === undefined || version === undefined) continue;

    providers.push({ plugin, version });
  }

  return providers;
}

/** One plugin version that provides a shim's command. */
export interface AsdfShimProvider {
  readonly plugin: string;
  readonly version: string;
}
