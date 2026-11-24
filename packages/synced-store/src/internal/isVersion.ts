import { isString } from '@williamthorsen/toolbelt.guards';
import { isPlainObject } from '@williamthorsen/toolbelt.objects';

import type { Version } from '../1-proposed/types.ts';
import { parseStamp } from './parseStamp.ts';

/**
 * Returns true if the value has the shape of a version and a stamp that parses. A version's value is not checked
 * beyond being present, since it arrives through `JSON.parse`.
 *
 * @internal
 */
export function isVersion(value: unknown): value is Version {
  if (!isPlainObject(value) || !isString(value['stamp']) || !isStamp(value['stamp'])) return false;
  if (value['kind'] === 'part') return isString(value['name']) && 'value' in value && !('deleted' in value);
  if (value['kind'] !== 'item' || !isString(value['collection']) || !isString(value['id'])) return false;
  return 'value' in value ? !('deleted' in value) : value['deleted'] === true;
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
