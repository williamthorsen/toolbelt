import { describe, expect, it } from 'vitest';

import { compareStamps } from '../compareStamps.ts';
import { HybridClock } from '../HybridClock.ts';

const T0 = Date.parse('2026-11-24T14:40:07.123Z');

describe(HybridClock, () => {
  it('stamps the wall-clock time, a zero counter, and the device id', () => {
    const clock = new HybridClock({ deviceId: 'a', now: () => T0 });

    expect(clock.issue()).toBe('2026-11-24T14:40:07.123Z_0000_a');
  });

  it('increments the counter while the wall clock stands still', () => {
    const clock = new HybridClock({ deviceId: 'a', now: () => T0 });

    expect([clock.issue(), clock.issue(), clock.issue()]).toStrictEqual([
      '2026-11-24T14:40:07.123Z_0000_a',
      '2026-11-24T14:40:07.123Z_0001_a',
      '2026-11-24T14:40:07.123Z_0002_a',
    ]);
  });

  it('issues increasing stamps when the wall clock goes backward', () => {
    const times = [T0, T0 - 5000, T0 - 10_000];
    const clock = new HybridClock({ deviceId: 'a', now: () => times.shift() ?? T0 });

    const stamps = [clock.issue(), clock.issue(), clock.issue()];

    expect(stamps).toStrictEqual(stamps.toSorted(compareStamps));
    expect(new Set(stamps).size).toBe(3);
  });

  it('advances the time by 1 ms and resets the counter when the counter overflows', () => {
    const clock = new HybridClock({ deviceId: 'a', last: '2026-11-24T14:40:07.123Z_ffff_a', now: () => T0 });

    expect(clock.issue()).toBe('2026-11-24T14:40:07.124Z_0000_a');
  });

  it('orders stamps by code unit across a millisecond boundary and a counter rollover', () => {
    const stamps = [
      '2026-11-24T14:40:07.123Z_0009_a',
      '2026-11-24T14:40:07.123Z_000a_a',
      '2026-11-24T14:40:07.123Z_ffff_a',
      '2026-11-24T14:40:07.124Z_0000_a',
      '2026-11-24T14:40:08.000Z_0000_a',
    ];

    expect(stamps.toReversed().toSorted(compareStamps)).toStrictEqual(stamps);
  });

  it('issues a stamp greater than one that it observed from another device', () => {
    const clock = new HybridClock({ deviceId: 'z', now: () => T0 });
    const observed = '2026-11-24T14:41:00.000Z_0003_a';

    clock.observe(observed);

    expect(compareStamps(clock.issue(), observed)).toBeGreaterThan(0);
  });

  it('ignores an observed stamp older than its own state', () => {
    const clock = new HybridClock({ deviceId: 'a', now: () => T0 });
    clock.issue();

    clock.observe('2026-11-24T14:00:00.000Z_0000_b');

    expect(clock.issue()).toBe('2026-11-24T14:40:07.123Z_0001_a');
  });

  it('resumes after the state that an earlier clock exposed', () => {
    const earlier = new HybridClock({ deviceId: 'a', now: () => T0 });
    const last = earlier.issue();

    const later = new HybridClock({ deviceId: 'a', last, now: () => T0 - 1000 });

    expect(later.last).toBe(last);
    expect(compareStamps(later.issue(), last)).toBeGreaterThan(0);
  });

  it('exposes no state before its first stamp', () => {
    expect(new HybridClock({ deviceId: 'a' }).last).toBeUndefined();
  });

  it.each([
    ['an empty device id', ''],
    ['a device id with a space', 'device a'],
    ['a device id outside ASCII', 'appareil-é'],
  ])('throws on %s', (_label, deviceId) => {
    expect(() => new HybridClock({ deviceId })).toThrow(TypeError);
  });

  it('throws on observing a malformed stamp', () => {
    const clock = new HybridClock({ deviceId: 'a' });

    expect(() => clock.observe('2026-11-24_0000_b')).toThrow(TypeError);
  });

  it('throws when the wall clock is outside the range that a stamp expresses', () => {
    const clock = new HybridClock({ deviceId: 'a', now: () => -1 });

    expect(() => clock.issue()).toThrow(RangeError);
  });
});
