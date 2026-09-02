import { describe, expect, it } from 'vitest';

import { listRandomItemLines } from '../listRandomItemLines.ts';

describe(listRandomItemLines, () => {
  it('claims a floored random indexing an array', () => {
    expect(listRandomItemLines('const item = items[Math.floor(Math.random() * items.length)];\n')).toStrictEqual([1]);
  });

  // These are the sources that `toolbelt.numbers` asserts its own detector skips, so the two must agree on
  // all of them: a form claimed by neither is a site that the consumer never hears about.
  it('claims every subscript declined by the numbers kit, however it is spaced or chained', () => {
    const subscripts = [
      'const item = items?.[Math.floor(Math.random() * items.length)];\n',
      'const item = items[\n  Math.floor(Math.random() * items.length)\n];\n',
      'const item = items[ Math.floor(Math.random() * items.length) ];\n',
    ];

    expect(subscripts.filter((source) => listRandomItemLines(source).length === 0)).toStrictEqual([]);
  });

  it('claims a subscript whose bound is not the subject’s own length', () => {
    expect(listRandomItemLines('const suit = SUITS[Math.floor(Math.random() * 4)];\n')).toStrictEqual([1]);
  });

  it('claims a subscript on a call result or a nested subscript', () => {
    const subscripts = [
      'const item = readItems()[Math.floor(Math.random() * total)];\n',
      'const cell = grid[row][Math.floor(Math.random() * width)];\n',
    ];

    expect(subscripts.filter((source) => listRandomItemLines(source).length === 0)).toStrictEqual([]);
  });

  // The site belongs to `toolbelt.numbers`, whose kit recommends `pickInteger`.
  it('declines a floored random outside subscript position', () => {
    const sources = [
      'const roll = Math.floor(Math.random() * sides);\n',
      'return [Math.floor(Math.random() * sides)];\n',
      'const index = Math.floor(Math.random() * items.length);\nconst item = items[index];\n',
    ];

    expect(sources.filter((source) => listRandomItemLines(source).length > 0)).toStrictEqual([]);
  });

  it('declines a subscript holding anything but a scaled random', () => {
    const sources = ['const item = items[Math.floor(offset / 2)];\n', 'const item = items[index];\n'];

    expect(sources.filter((source) => listRandomItemLines(source).length > 0)).toStrictEqual([]);
  });
});
