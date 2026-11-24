/** The latest time that an ISO 8601 instant with a four-digit year can express, in milliseconds since the epoch. */
export const MAX_STAMP_TIME = Date.parse('9999-12-31T23:59:59.999Z');

/** The largest counter that a stamp's four hexadecimal digits can express. */
export const MAX_STAMP_COUNTER = 0xffff;

const DEVICE_ID_PATTERN = /^[!-~]+$/u;

const STAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)_([\da-f]{4})_([!-~]+)$/u;

/** The fields of a change stamp. */
export interface StampFields {
  time: number;
  counter: number;
  deviceId: string;
}

/**
 * Formats the fields as a stamp whose code-unit order is the order of its time, then its counter, then its device
 * id. The time is an integer between 0 and `MAX_STAMP_TIME`, and the counter an integer between 0 and
 * `MAX_STAMP_COUNTER`.
 *
 * @internal
 */
export function formatStamp({ time, counter, deviceId }: StampFields): string {
  return `${new Date(time).toISOString()}_${counter.toString(16).padStart(4, '0')}_${deviceId}`;
}

/**
 * Returns true if the device id is one or more printable ASCII characters other than the space. Within ASCII, the
 * UTF-16 order of `compareStamps` and the byte order of a SQL binary collation agree.
 *
 * @internal
 */
export function isDeviceId(deviceId: string): boolean {
  return DEVICE_ID_PATTERN.test(deviceId);
}

/**
 * Splits a stamp into its fields, throwing a `TypeError` when it does not match the encoding.
 *
 * @internal
 */
export function parseStamp(stamp: string): StampFields {
  const match = STAMP_PATTERN.exec(stamp);
  const [, instant, counter, deviceId] = match ?? [];
  if (instant === undefined || counter === undefined || deviceId === undefined) {
    throw new TypeError(`Not a change stamp: ${JSON.stringify(stamp)}`);
  }
  const time = Date.parse(instant);
  if (Number.isNaN(time) || new Date(time).toISOString() !== instant) {
    throw new TypeError(`Not a change stamp: ${JSON.stringify(stamp)}`);
  }
  return { time, counter: Number.parseInt(counter, 16), deviceId };
}
