import { describe, expect, it } from 'vitest';

import { clamp } from '../clamp.ts';

describe(clamp, () => {
  const min = 0;
  const max = 10;

  it('returns the value if it is within the range', () => {
    expect(clamp(5, { min, max })).toBe(5);
  });

  it('returns the minimum value if the value is less than the minimum', () => {
    expect(clamp(-5, { min, max })).toBe(min);
  });

  it('returns the maximum value if the value is greater than the maximum', () => {
    expect(clamp(15, { max })).toBe(max);
  });

  it('returns the value if no min or max is provided', () => {
    expect(clamp(5, {})).toBe(5);
  });

  it('throws an error if min is greater than max', () => {
    const throwingFn = () => clamp(5, { min: 10, max: 0 });

    expect(throwingFn).toThrow(new RangeError('Minimum value cannot be greater than maximum value'));
  });
});
