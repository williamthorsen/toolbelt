import { describe, expect, it } from 'vitest';

import { stripCommonIndent } from '../stripCommonIndent.ts';

describe(stripCommonIndent, () => {
  it('removes the indent shared by every line', () => {
    expect(stripCommonIndent('    alpha\n    beta')).toBe('alpha\nbeta');
  });

  it('preserves relative depth', () => {
    expect(stripCommonIndent('  alpha\n      beta')).toBe('alpha\n    beta');
  });

  it('ignores a blank line when measuring, and empties it in the output', () => {
    expect(stripCommonIndent('      alpha\n  \n      beta')).toBe('alpha\n\nbeta');
  });

  it('returns the input unchanged when a line already starts at column zero', () => {
    expect(stripCommonIndent('alpha\n    beta')).toBe('alpha\n    beta');
  });

  it('strips nothing when indents disagree in character, not merely in depth', () => {
    expect(stripCommonIndent('\talpha\n        beta')).toBe('\talpha\n        beta');
  });

  it('discards no lines, so a trailing newline survives', () => {
    expect(stripCommonIndent('  alpha\n  beta\n')).toBe('alpha\nbeta\n');
  });

  it('does not discard a leading blank line the way the tag would', () => {
    expect(stripCommonIndent('\n  alpha\n')).toBe('\nalpha\n');
  });

  it('preserves CRLF terminators rather than normalizing them', () => {
    expect(stripCommonIndent('    alpha\r\n\r\n    beta\r\n')).toBe('alpha\r\n\r\nbeta\r\n');
  });

  it('dedents a text carrying a byte-order mark, keeping the mark', () => {
    expect(stripCommonIndent('\u{FEFF}  alpha\n  beta')).toBe('\u{FEFF}alpha\nbeta');
  });

  it('treats a non-breaking space as content rather than as indentation', () => {
    expect(stripCommonIndent('  \u{A0}alpha\n  \u{A0}beta')).toBe('\u{A0}alpha\n\u{A0}beta');
  });

  it.each(['', '\n', ' '.repeat(3), '\t\n\t'])('returns a defined result for %j', (text) => {
    expect(stripCommonIndent(text)).toBeTypeOf('string');
  });

  it('empties an all-blank text rather than discarding its line breaks', () => {
    expect(stripCommonIndent('   \n   ')).toBe('\n');
  });
});
