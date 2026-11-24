import { describe, expect, it } from 'vitest';

import { formatStamp, parseStamp } from '../parseStamp.ts';

describe(parseStamp, () => {
  it('splits a stamp into its time, counter, and device id', () => {
    expect(parseStamp('2026-11-24T14:40:07.123Z_00ff_device_1')).toStrictEqual({
      time: Date.parse('2026-11-24T14:40:07.123Z'),
      counter: 255,
      deviceId: 'device_1',
    });
  });

  it.each([
    ['an empty device id', '2026-11-24T14:40:07.123Z_0000_'],
    ['a device id outside ASCII', '2026-11-24T14:40:07.123Z_0000_\u{10000}'],
    ['a counter in upper case', '2026-11-24T14:40:07.123Z_00FF_a'],
    ['a time without milliseconds', '2026-11-24T14:40:07Z_0000_a'],
    ['a time that does not exist', '2026-02-30T14:40:07.123Z_0000_a'],
    ['an empty string', ''],
  ])('throws on %s', (_label, stamp) => {
    expect(() => parseStamp(stamp)).toThrow(TypeError);
  });
});

describe(formatStamp, () => {
  it('round-trips through parseStamp', () => {
    const fields = { time: Date.parse('2026-11-24T14:40:07.123Z'), counter: 10, deviceId: 'a' };

    expect(parseStamp(formatStamp(fields))).toStrictEqual(fields);
  });
});
