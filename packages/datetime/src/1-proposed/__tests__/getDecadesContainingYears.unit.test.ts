import { describe, expect, it } from 'vitest';

import { getDecadesContainingYears } from '../getDecadesContainingYears.ts';

describe(getDecadesContainingYears, () => {
  it('returns a single decade for years within the same decade', () => {
    const input = [1_980, 1_981, 1_985, 1_989];

    const result = getDecadesContainingYears(input);

    expect(result).toStrictEqual([{ start: 1_980, end: 1_989, label: '1980s' }]);
  });

  it('returns multiple decades for years across decades', () => {
    const input = [1_978, 1_982, 1_999, 2_000];

    const result = getDecadesContainingYears(input);

    expect(result).toStrictEqual([
      { start: 1_970, end: 1_979, label: '1970s' },
      { start: 1_980, end: 1_989, label: '1980s' },
      { start: 1_990, end: 1_999, label: '1990s' },
      { start: 2_000, end: 2_009, label: '2000s' },
    ]);
  });

  it('deduplicates input years', () => {
    const input = [1_990, 1_990, 1_991];

    const result = getDecadesContainingYears(input);

    expect(result).toStrictEqual([{ start: 1_990, end: 1_999, label: '1990s' }]);
  });

  it('returns an empty array for no input', () => {
    expect(getDecadesContainingYears([])).toStrictEqual([]);
  });

  it('returns decades in ascending order regardless of input order', () => {
    const input = [2_005, 1_985, 1_995];

    const result = getDecadesContainingYears(input);

    expect(result).toStrictEqual([
      { start: 1_980, end: 1_989, label: '1980s' },
      { start: 1_990, end: 1_999, label: '1990s' },
      { start: 2_000, end: 2_009, label: '2000s' },
    ]);
  });

  it('throws a RangeError when any years are negative', () => {
    expect(() => getDecadesContainingYears([-1, 1_980])).toThrow(RangeError);
  });
});
