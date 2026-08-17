import { describe, expect, it } from 'vitest';

import { getLineAtOffset } from '../getLineAtOffset.ts';

const SOURCE = 'first\nsecond\nthird';

describe(getLineAtOffset, () => {
  it('numbers the first line 1', () => {
    expect(getLineAtOffset(SOURCE, 0)).toBe(1);
  });

  it('numbers the line holding an offset', () => {
    expect(getLineAtOffset(SOURCE, SOURCE.indexOf('third'))).toBe(3);
  });

  it('attributes a newline to the line it ends', () => {
    expect(getLineAtOffset(SOURCE, SOURCE.indexOf('\n'))).toBe(1);
  });

  it('attributes the offset just past a newline to the line it begins', () => {
    expect(getLineAtOffset(SOURCE, SOURCE.indexOf('\n') + 1)).toBe(2);
  });
});
