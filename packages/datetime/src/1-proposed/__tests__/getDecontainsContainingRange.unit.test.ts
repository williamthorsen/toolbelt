import { describe, expect, it } from 'vitest';

import { getDecadesContainingRange } from '../getDecadesContainingRange.ts';

describe(getDecadesContainingRange, () => {
  it('returns a single decade when start and end are within the same decade', () => {
    const result = getDecadesContainingRange({ start: 1981, end: 1989 });
    expect(result).toStrictEqual([{ start: 1980, end: 1989, label: '1980s' }]);
  });

  it('returns multiple decades for a range spanning multiple decades', () => {
    const result = getDecadesContainingRange({ start: 1978, end: 2005 });
    expect(result).toStrictEqual([
      { start: 1970, end: 1979, label: '1970s' },
      { start: 1980, end: 1989, label: '1980s' },
      { start: 1990, end: 1999, label: '1990s' },
      { start: 2000, end: 2009, label: '2000s' },
    ]);
  });

  it('returns a single decade for a one-year range at a decade boundary', () => {
    const result = getDecadesContainingRange({ start: 1990, end: 1990 });
    expect(result).toStrictEqual([{ start: 1990, end: 1999, label: '1990s' }]);
  });

  it('returns an empty array when start is greater than end', () => {
    const result = getDecadesContainingRange({ start: 2020, end: 2010 });
    expect(result).toStrictEqual([]);
  });

  it('throws a RangeError when the range includes negative years', () => {
    expect(() => getDecadesContainingRange({ start: -25, end: 5 })).toThrow(RangeError);
  });

  it('returns only the start decade when end is exactly at the start decade boundary', () => {
    const result = getDecadesContainingRange({ start: 2000, end: 2000 });
    expect(result).toStrictEqual([{ start: 2000, end: 2009, label: '2000s' }]);
  });
});
