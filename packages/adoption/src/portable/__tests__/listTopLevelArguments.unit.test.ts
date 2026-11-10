import { describe, expect, it } from 'vitest';

import { listTopLevelArguments } from '../listTopLevelArguments.ts';

describe(listTopLevelArguments, () => {
  it('splits on each top-level comma and keeps the whitespace around each argument', () => {
    expect(listTopLevelArguments('a, b,c')).toStrictEqual(['a', ' b', 'c']);
  });

  it.each([
    ['a parenthesis', 'f(a, b), c', ['f(a, b)', ' c']],
    ['a bracket', '[a, b], c', ['[a, b]', ' c']],
    ['a brace', '{ a, b }, c', ['{ a, b }', ' c']],
  ])('reads a comma inside %s as part of one argument', (_label, inner, expected) => {
    expect(listTopLevelArguments(inner)).toStrictEqual(expected);
  });

  it.each([
    ['without whitespace', 'a, b,', ['a', ' b']],
    ['followed by whitespace', 'a, b, ', ['a', ' b']],
  ])('drops the empty tail of a trailing comma %s', (_label, inner, expected) => {
    expect(listTopLevelArguments(inner)).toStrictEqual(expected);
  });

  it('reads an empty argument list as one empty argument', () => {
    expect(listTopLevelArguments('')).toStrictEqual(['']);
  });

  it('reads a lone comma as one empty argument', () => {
    expect(listTopLevelArguments(',')).toStrictEqual(['']);
  });
});
