import { blankNonCode } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

import { findExpressionEnd, readPathParts } from '../readPathParts.ts';

describe(readPathParts, () => {
  it('reads the text of single- and double-quoted literals', () => {
    expect(read(`'a' + "b"`)).toStrictEqual([
      { kind: 'text', text: 'a' },
      { kind: 'text', text: 'b' },
    ]);
  });

  it('reads a bare name and leaves out the name of a member', () => {
    expect(read('dir + options.name')).toStrictEqual([
      { kind: 'read', name: 'dir' },
      { kind: 'read', name: 'options' },
    ]);
  });

  it('reads a template as its text chunks with the parts of each interpolation between them', () => {
    expect(read('`${dir}/a/${name}.json`')).toStrictEqual([
      { kind: 'text', text: '' },
      { kind: 'read', name: 'dir' },
      { kind: 'text', text: '/a/' },
      { kind: 'read', name: 'name' },
      { kind: 'text', text: '.json' },
    ]);
  });

  it('reads a template nested in an interpolation in place', () => {
    expect(read('`${dir}/${`b/${name}`}`')).toStrictEqual([
      { kind: 'text', text: '' },
      { kind: 'read', name: 'dir' },
      { kind: 'text', text: '/' },
      { kind: 'text', text: 'b/' },
      { kind: 'read', name: 'name' },
      { kind: 'text', text: '' },
      { kind: 'text', text: '' },
    ]);
  });

  it('returns nothing when a template never closes', () => {
    expect(read('`${dir}/a')).toBeUndefined();
  });

  it('returns nothing when a template closes past the end of the expression', () => {
    const source = '`${dir}/a`';
    const code = blankNonCode(source);

    expect(readPathParts(code, source, 0, source.length - 1)).toBeUndefined();
  });
});

describe(findExpressionEnd, () => {
  it('ends at a comma outside every bracket', () => {
    expect(findEnd('dir, "utf8"')).toBe(3);
  });

  it('ends at a semicolon outside every bracket', () => {
    expect(findEnd('dir; next')).toBe(3);
  });

  it('passes a comma inside brackets', () => {
    expect(findEnd('join(dir, "a"), next')).toBe(14);
  });

  it('ends at the bracket closing the group that holds the expression', () => {
    expect(findEnd('join(dir)) + rest')).toBe(9);
  });

  it('ends at the limit when nothing ends the expression first', () => {
    expect(findEnd('dir + "a"')).toBe(9);
  });
});

// region | Helpers

/** Returns the offset at which the expression opening the whole source ends. */
function findEnd(source: string): number {
  return findExpressionEnd(blankNonCode(source), 0, source.length);
}

/** Reads the whole source as one path expression. */
function read(source: string): ReturnType<typeof readPathParts> {
  return readPathParts(blankNonCode(source), source, 0, source.length);
}

// endregion | Helpers
