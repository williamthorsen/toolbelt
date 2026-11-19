import { listSourceSites } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listRandomIntegerSites } from '../listRandomIntegerSites.ts';

describe(listRandomIntegerSites, () => {
  it('claims a floored random scaled by a bound', () => {
    expect(listLines('const roll = Math.floor(Math.random() * sides);\n')).toStrictEqual([1]);
  });

  it('claims a floored random offset to a range', () => {
    expect(listLines('const n = Math.floor(Math.random() * (max - min + 1)) + min;\n')).toStrictEqual([1]);
  });

  it('claims a floored random broken across lines by a formatter, at the line on which it opens', () => {
    expect(listLines('const n = Math.floor(\n  Math.random() * sides,\n);\n')).toStrictEqual([1]);
  });

  // The site belongs to `toolbelt.arrays`, whose kit recommends `pickItem`.
  it('declines a floored random in array-subscript position', () => {
    const source = 'const item = items[Math.floor(Math.random() * items.length)];\n';

    expect(listLines(source)).toStrictEqual([]);
  });

  // The anchor tolerates whatever spacing a formatter left, so the hand-off has to tolerate it too.
  it('declines a subscript however it is spaced or chained', () => {
    const subscripts = [
      'const item = items?.[Math.floor(Math.random() * items.length)];\n',
      'const item = items[\n  Math.floor(Math.random() * items.length)\n];\n',
      'const item = items[ Math.floor(Math.random() * items.length) ];\n',
    ];

    expect(subscripts.filter((source) => listLines(source).length > 0)).toStrictEqual([]);
  });

  it('claims a floored random inside an array literal, which is no subscript', () => {
    expect(listLines('return [Math.floor(Math.random() * sides)];\n')).toStrictEqual([1]);
  });

  it('claims a floored random whose bound is a length read off an array', () => {
    const source = 'const index = Math.floor(Math.random() * items.length);\nconst item = items[index];\n';

    expect(listLines(source)).toStrictEqual([1]);
  });

  it('declines a floor over anything but a scaled random', () => {
    const sources = ['const a = Math.floor(total / count);\n', 'const a = Math.random();\n'];

    expect(sources.filter((source) => listLines(source).length > 0)).toStrictEqual([]);
  });

  // Blanking leaves a literal's delimiters in place, which lets `isArraySubscript` read the closing quote as
  // the expression indexed by a subscript. Blank the quotes too and this kit claims a site that it hands off.
  it('declines a floored random subscripting a string literal, which another kit claims', () => {
    expect(listLines("const character = 'abcdef'[Math.floor(Math.random() * 6)];\n")).toStrictEqual([]);
  });
});

// region | Helpers

/** Lists the lines of the sites that the detector finds in a source, blanked as the kit blanks it. */
function listLines(source: string): number[] {
  return listSourceSites([listRandomIntegerSites], source).map(({ line }) => line);
}

// endregion | Helpers
