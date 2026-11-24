import type { Version } from '../1-proposed/types.ts';
import { isVersion } from './isVersion.ts';

/**
 * Parses a JSON array of versions, throwing a `TypeError` that names the source when the text is not one.
 *
 * @internal
 */
export function parseVersions(json: string, source: string): Version[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new TypeError(`${source} does not contain JSON`, { cause: error });
  }
  if (!Array.isArray(parsed)) {
    throw new TypeError(`${source} does not contain an array of versions`);
  }
  const versions: Version[] = [];
  for (const element of parsed) {
    if (!isVersion(element)) {
      throw new TypeError(`${source} contains a value that is not a version: ${JSON.stringify(element)}`);
    }
    versions.push(element);
  }
  return versions;
}
