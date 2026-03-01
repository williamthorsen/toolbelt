import { describe, expect, it } from 'vitest';

import { getDecadesContainingYears } from '../getDecadesContainingYears.ts';

describe(getDecadesContainingYears, () => {
  it('returns a single decade for years within the same decade', () => {
    const input = [1980, 1981, 1985, 1989];

    const result = getDecadesContainingYears(input);

    expect(result).toStrictEqual([{ start: 1980, end: 1989, label: '1980s' }]);
  });

  it('returns multiple decades for years across decades', () => {
    const input = [1978, 1982, 1999, 2000];

    const result = getDecadesContainingYears(input);

    expect(result).toStrictEqual([
      { start: 1970, end: 1979, label: '1970s' },
      { start: 1980, end: 1989, label: '1980s' },
      { start: 1990, end: 1999, label: '1990s' },
      { start: 2000, end: 2009, label: '2000s' },
    ]);
  });

  it('deduplicates input years', () => {
    const input = [1990, 1990, 1991];

    const result = getDecadesContainingYears(input);

    expect(result).toStrictEqual([{ start: 1990, end: 1999, label: '1990s' }]);
  });

  it('returns an empty array for no input', () => {
    expect(getDecadesContainingYears([])).toStrictEqual([]);
  });

  it('returns decades in ascending order regardless of input order', () => {
    const input = [2005, 1985, 1995];

    const result = getDecadesContainingYears(input);

    expect(result).toStrictEqual([
      { start: 1980, end: 1989, label: '1980s' },
      { start: 1990, end: 1999, label: '1990s' },
      { start: 2000, end: 2009, label: '2000s' },
    ]);
  });

  it('throws a RangeError when any years are negative', () => {
    expect(() => getDecadesContainingYears([-1, 1980])).toThrowError(RangeError);
  });
});
