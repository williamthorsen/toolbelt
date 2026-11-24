import type { Version } from '../1-proposed/types.ts';
import { isVersion } from './isVersion.ts';
import { parseVersions } from './parseVersions.ts';

/**
 * Returns copies of the versions that share no value with them, throwing a `TypeError` when one is malformed or its
 * value would not survive a JSON round trip unchanged.
 *
 * @internal
 */
export function copyVersions(versions: readonly Version[]): Version[] {
  for (const version of versions) {
    if (!isVersion(version)) {
      throw new TypeError(`Not a version, or its value is not JSON: ${JSON.stringify(version)}`);
    }
  }
  return parseVersions(JSON.stringify(versions), 'The versions');
}
