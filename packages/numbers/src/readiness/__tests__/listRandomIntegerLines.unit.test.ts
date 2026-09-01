import { describe, expect, it } from 'vitest';

import { listRandomIntegerLines } from '../listRandomIntegerLines.ts';

describe(listRandomIntegerLines, () => {
  it('claims a floored random scaled by a bound', () => {
    expect(listRandomIntegerLines('const roll = Math.floor(Math.random() * sides);\n')).toStrictEqual([1]);
  });

  it('claims a floored random offset to a range', () => {
    expect(listRandomIntegerLines('const n = Math.floor(Math.random() * (max - min + 1)) + min;\n')).toStrictEqual([1]);
  });

  it('claims a floored random broken across lines by a formatter, at the line it opens on', () => {
    expect(listRandomIntegerLines('const n = Math.floor(\n  Math.random() * sides,\n);\n')).toStrictEqual([1]);
  });

  // The site belongs to `toolbelt.arrays`, whose kit recommends `pickItem`.
  it('declines a floored random in array-subscript position', () => {
    const source = 'const item = items[Math.floor(Math.random() * items.length)];\n';

    expect(listRandomIntegerLines(source)).toStrictEqual([]);
  });

  // The anchor tolerates whatever spacing a formatter left, so the hand-off has to tolerate it too.
  it('declines a subscript however it is spaced or chained', () => {
    const subscripts = [
      'const item = items?.[Math.floor(Math.random() * items.length)];\n',
      'const item = items[\n  Math.floor(Math.random() * items.length)\n];\n',
      'const item = items[ Math.floor(Math.random() * items.length) ];\n',
    ];

    expect(subscripts.filter((source) => listRandomIntegerLines(source).length > 0)).toStrictEqual([]);
  });

  it('claims a floored random inside an array literal, which is no subscript', () => {
    expect(listRandomIntegerLines('return [Math.floor(Math.random() * sides)];\n')).toStrictEqual([1]);
  });

  it('claims a floored random whose bound is a length read off an array', () => {
    const source = 'const index = Math.floor(Math.random() * items.length);\nconst item = items[index];\n';

    expect(listRandomIntegerLines(source)).toStrictEqual([1]);
  });

  it('declines a floor over anything but a scaled random', () => {
    const sources = ['const a = Math.floor(total / count);\n', 'const a = Math.random();\n'];

    expect(sources.filter((source) => listRandomIntegerLines(source).length > 0)).toStrictEqual([]);
  });
});
