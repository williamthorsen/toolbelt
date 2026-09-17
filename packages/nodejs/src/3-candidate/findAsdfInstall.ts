import path from 'node:path';

/**
 * Finds the asdf install that an executable belongs to, from its path alone: `<dataDir>/installs/<plugin>/<version>/bin/…`
 * yields the data directory, the plugin, and the version. Returns `undefined` for a path of any other shape, which
 * is an executable that asdf does not manage. The last `installs` segment is the one matched, so a data directory
 * whose own path contains that name still resolves.
 *
 * @category asdf
 * @experimental
 * @stage candidate
 */
export function findAsdfInstall(execPath: string): AsdfInstall | undefined {
  const segments = execPath.split(path.sep);

  for (let index = segments.length - 4; index >= 1; index -= 1) {
    const [installs, plugin, version, bin] = segments.slice(index, index + 4);

    if (installs === 'installs' && bin === 'bin' && isNamed(plugin) && isNamed(version)) {
      return { dataDir: segments.slice(0, index).join(path.sep), plugin, version };
    }
  }

  return undefined;
}

/** The asdf data directory, plugin, and version that provide an executable. */
export interface AsdfInstall {
  readonly dataDir: string;
  readonly plugin: string;
  readonly version: string;
}

// region | Helpers

/** Reports whether a path segment is present and non-empty. */
function isNamed(segment: string | undefined): segment is string {
  return segment !== undefined && segment !== '';
}

// endregion | Helpers
