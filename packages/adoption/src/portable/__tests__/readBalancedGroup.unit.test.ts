import { describe, expect, it } from 'vitest';

import { BRACES, PARENTHESES, readBalancedGroup } from '../readBalancedGroup.ts';

describe(readBalancedGroup, () => {
  it('spans an opening delimiter to one past its match', () => {
    const source = 'x { a } y';
    const group = readBalancedGroup(source, 0, BRACES);

    expect(group).toStrictEqual({ end: 7, start: 2 });
    expect(source.slice(group?.start, group?.end)).toBe('{ a }');
  });

  it('matches the outermost delimiter, not the first close it meets', () => {
    const source = 'f({ a: { b: 1 } })';
    const group = readBalancedGroup(source, 0, PARENTHESES);

    expect(source.slice(group?.start, group?.end)).toBe('({ a: { b: 1 } })');
  });

  it('skips a delimiter ahead of the offset', () => {
    const source = '{ first } { second }';
    const group = readBalancedGroup(source, source.indexOf('} ') + 1, BRACES);

    expect(source.slice(group?.start, group?.end)).toBe('{ second }');
  });

  it('returns nothing where the group never balances', () => {
    expect(readBalancedGroup('f({ a: 1 }', 0, PARENTHESES)).toBeUndefined();
  });

  it('returns nothing where the source holds no opening delimiter', () => {
    expect(readBalancedGroup('nothing here', 0, BRACES)).toBeUndefined();
  });
});
