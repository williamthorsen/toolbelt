import { describe, expect, it } from 'vitest';

import { listDecadesContainingRange } from '../listDecadesContainingRange.ts';

describe(listDecadesContainingRange, () => {
  it('returns a single decade when start and end are within the same decade', () => {
    const result = listDecadesContainingRange({ start: 1_981, end: 1_989 });
    expect(result).toStrictEqual([{ start: 1_980, end: 1_989, label: '1980s' }]);
  });

  it('returns multiple decades for a range spanning multiple decades', () => {
    const result = listDecadesContainingRange({ start: 1_978, end: 2_005 });
    expect(result).toStrictEqual([
      { start: 1_970, end: 1_979, label: '1970s' },
      { start: 1_980, end: 1_989, label: '1980s' },
      { start: 1_990, end: 1_999, label: '1990s' },
      { start: 2_000, end: 2_009, label: '2000s' },
    ]);
  });

  it('returns a single decade for a one-year range at a decade boundary', () => {
    const result = listDecadesContainingRange({ start: 1_990, end: 1_990 });
    expect(result).toStrictEqual([{ start: 1_990, end: 1_999, label: '1990s' }]);
  });

  it('returns an empty array when start is greater than end', () => {
    const result = listDecadesContainingRange({ start: 2_020, end: 2_010 });
    expect(result).toStrictEqual([]);
  });

  it('throws a RangeError when the range includes negative years', () => {
    expect(() => listDecadesContainingRange({ start: -25, end: 5 })).toThrow(RangeError);
  });

  it('returns only the start decade when end is exactly at the start decade boundary', () => {
    const result = listDecadesContainingRange({ start: 2_000, end: 2_000 });
    expect(result).toStrictEqual([{ start: 2_000, end: 2_009, label: '2000s' }]);
  });
});
