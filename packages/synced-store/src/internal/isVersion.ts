import { isString } from '@williamthorsen/toolbelt.guards';
import { isPlainObject } from '@williamthorsen/toolbelt.objects';

import type { Version } from '../1-proposed/types.ts';
import { isJsonValue } from './isJsonValue.ts';
import { parseStamp } from './parseStamp.ts';

/**
 * Returns true if the value has the shape of a version, a stamp that parses, and, unless it is a tombstone, a value
 * that survives a JSON round trip unchanged.
 *
 * @internal
 */
export function isVersion(value: unknown): value is Version {
  if (!isPlainObject(value) || !isString(value['stamp']) || !isStamp(value['stamp'])) return false;
  if (value['kind'] === 'part') return isString(value['name']) && isJsonValue(value['value']) && !('deleted' in value);
  if (value['kind'] !== 'item' || !isString(value['collection']) || !isString(value['id'])) return false;
  return 'value' in value ? isJsonValue(value['value']) && !('deleted' in value) : value['deleted'] === true;
}

// region | Helpers
function isStamp(stamp: string): boolean {
  try {
    parseStamp(stamp);
    return true;
  } catch {
    return false;
  }
}
// endregion | Helpers
