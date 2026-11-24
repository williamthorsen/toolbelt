import { describe, expect, it } from 'vitest';

import { compareStamps } from '../compareStamps.ts';

describe(compareStamps, () => {
  it('orders an older stamp before a newer one', () => {
    const older = '2026-11-24T14:40:07.123Z_0000_b';
    const newer = '2026-11-24T14:40:07.123Z_0001_a';

    expect(compareStamps(older, newer)).toBeLessThan(0);
    expect(compareStamps(newer, older)).toBeGreaterThan(0);
  });

  it('breaks a tie of time and counter by the device id', () => {
    expect(compareStamps('2026-11-24T14:40:07.123Z_0000_a', '2026-11-24T14:40:07.123Z_0000_b')).toBeLessThan(0);
  });

  it('returns 0 for equal stamps', () => {
    expect(compareStamps('2026-11-24T14:40:07.123Z_0000_a', '2026-11-24T14:40:07.123Z_0000_a')).toBe(0);
  });
});
