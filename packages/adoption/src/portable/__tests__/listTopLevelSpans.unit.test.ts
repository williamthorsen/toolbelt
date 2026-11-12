import { describe, expect, it } from 'vitest';

import { listTopLevelSpans } from '../listTopLevelSpans.ts';

describe(listTopLevelSpans, () => {
  it('splits on each top-level comma and keeps the whitespace around each item', () => {
    expect(listTopLevelSpans('a, b,c')).toStrictEqual([
      { end: 1, start: 0 },
      { end: 4, start: 2 },
      { end: 6, start: 5 },
    ]);
  });

  it.each([
    ['a parenthesis', 'f(a, b), c'],
    ['a bracket', '[a, b], c'],
    ['a brace', '{a, b}, c'],
  ])('reads a comma inside %s as part of one item', (_label, text) => {
    expect(listTopLevelSpans(text)).toHaveLength(2);
  });

  it.each([
    ['without whitespace', 'a, b,'],
    ['followed by whitespace', 'a, b, '],
  ])('drops the blank tail of a trailing comma %s', (_label, text) => {
    expect(listTopLevelSpans(text)).toStrictEqual([
      { end: 1, start: 0 },
      { end: 4, start: 2 },
    ]);
  });

  it('reads an empty range as one empty item', () => {
    expect(listTopLevelSpans('')).toStrictEqual([{ end: 0, start: 0 }]);
  });

  it('reads a lone comma as one empty item', () => {
    expect(listTopLevelSpans(',')).toStrictEqual([{ end: 0, start: 0 }]);
  });

  it('splits only within the given range, at offsets into the whole text', () => {
    expect(listTopLevelSpans('[a, b], c', 1, 5)).toStrictEqual([
      { end: 2, start: 1 },
      { end: 5, start: 3 },
    ]);
  });
});
