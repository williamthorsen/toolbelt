import { listSourceSites } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listRoundScaleSites } from '../listRoundScaleSites.ts';

describe(listRoundScaleSites, () => {
  it('claims a rounding scaled by a power-of-ten literal', () => {
    const source = 'const a = Math.round(value * 100) / 100;\nconst b = Math.round(value * 10) / 10;\n';

    expect(listLines(source)).toStrictEqual([1, 2]);
  });

  it('claims a rounding scaled by an exponentiation', () => {
    expect(listLines('const a = Math.round(value * 10 ** places) / 10 ** places;\n')).toStrictEqual([1]);
  });

  it('reads an exponentiation through whatever spacing a formatter left', () => {
    expect(listLines('const a = Math.round(value * 10 ** 2) / 10**2;\n')).toStrictEqual([1]);
  });

  it('claims a rounding broken across lines by a formatter, at the line on which it opens', () => {
    expect(listLines('const a =\n  Math.round(\n    value * 1000,\n  ) / 1000;\n')).toStrictEqual([2]);
  });

  it('declines a rounding that scales nothing', () => {
    expect(listLines('const a = Math.round(value);\n')).toStrictEqual([]);
  });

  it('declines a scaling that never scales back', () => {
    expect(listLines('const cents = Math.round(dollars * 100);\n')).toStrictEqual([]);
  });

  it('declines a divisor that differs from the factor', () => {
    expect(listLines('const a = Math.round(value * 100) / 10;\n')).toStrictEqual([]);
  });

  // Rounding to thirds is not a decimal rounding, and `round` cannot express it.
  it('declines a factor that is not a power of ten', () => {
    expect(listLines('const a = Math.round(value * 3) / 3;\n')).toStrictEqual([]);
  });

  it('declines a factor whose digits merely end in a power of ten', () => {
    expect(listLines('const a = Math.round(value * 210) / 210;\n')).toStrictEqual([]);
  });
});

// region | Helpers

/** Lists the lines of the sites that the detector finds in a source, blanked as the kit blanks it. */
function listLines(source: string): number[] {
  return listSourceSites([listRoundScaleSites], source).map(({ line }) => line);
}

// endregion | Helpers
