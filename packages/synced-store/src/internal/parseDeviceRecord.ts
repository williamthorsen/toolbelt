import { isPlainObject } from '@williamthorsen/toolbelt.objects';

import type { Version } from '../1-proposed/types.ts';
import { isDeviceId, parseStamp } from './parseStamp.ts';
import { parseVersions } from './parseVersions.ts';

/** What a device keeps beside its replica: its id, its clock's state, and the versions that the remote lacks. */
export interface DeviceRecord {
  deviceId: string;
  last: string | undefined;
  outbox: Version[];
}

/**
 * Parses a device record from JSON, throwing a `TypeError` that names the source when the text is not one.
 *
 * @internal
 */
export function parseDeviceRecord(json: string, source: string): DeviceRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new TypeError(`${source} does not contain JSON`, { cause: error });
  }
  if (!isPlainObject(parsed)) {
    throw new TypeError(`${source} does not contain a device record`);
  }
  const { deviceId, last, outbox } = parsed;
  if (typeof deviceId !== 'string' || !isDeviceId(deviceId)) {
    throw new TypeError(`${source} does not contain a valid device id`);
  }
  if (last !== undefined && typeof last !== 'string') {
    throw new TypeError(`${source} contains a clock state that is not a stamp`);
  }
  if (last !== undefined) {
    try {
      parseStamp(last);
    } catch (error) {
      throw new TypeError(`${source} contains a clock state that is not a stamp`, { cause: error });
    }
  }
  return { deviceId, last, outbox: parseVersions(JSON.stringify(outbox ?? null), `${source}'s outbox`) };
}
