import { describe, expect, it } from 'vitest';

import type { Version } from '../../1-proposed/types.ts';
import { type DeviceRecord, parseDeviceRecord } from '../parseDeviceRecord.ts';

const SOURCE = 'The device record';
const STAMP = '2026-11-24T14:40:07.123Z_0000_a';

describe(parseDeviceRecord, () => {
  it('returns the record that was stored', () => {
    const outbox: Version[] = [{ kind: 'part', name: 'names', stamp: STAMP, value: { player: 'Ann' } }];
    const record: DeviceRecord = { deviceId: 'a', last: STAMP, outbox };

    expect(parseDeviceRecord(JSON.stringify(record), SOURCE)).toStrictEqual(record);
  });

  it('returns an undefined clock state when the clock has not issued a stamp', () => {
    expect(parseDeviceRecord(JSON.stringify({ deviceId: 'a', outbox: [] }), SOURCE)).toStrictEqual({
      deviceId: 'a',
      last: undefined,
      outbox: [],
    });
  });

  it.each([
    ['text that is not JSON', '{'],
    ['a value that is not an object', '[]'],
    ['a missing device id', JSON.stringify({ outbox: [] })],
    ['a device id with a space', JSON.stringify({ deviceId: 'a b', outbox: [] })],
    ['a clock state that is not a stamp', JSON.stringify({ deviceId: 'a', last: 'yesterday', outbox: [] })],
    ['a missing outbox', JSON.stringify({ deviceId: 'a' })],
    ['an outbox entry that is not a version', JSON.stringify({ deviceId: 'a', outbox: [{ kind: 'part' }] })],
  ])('throws a TypeError naming the source for %s', (_case, json) => {
    expect(() => parseDeviceRecord(json, SOURCE)).toThrow(new RegExp(`^${SOURCE}`, 'u'));
    expect(() => parseDeviceRecord(json, SOURCE)).toThrow(TypeError);
  });
});
