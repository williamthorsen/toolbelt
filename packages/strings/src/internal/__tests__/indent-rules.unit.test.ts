import { describe, expect, it } from 'vitest';

import { findCommonIndent, findLineIndent, isBlankText } from '../indent-rules.ts';

describe(findCommonIndent, () => {
  it('returns the shared indent when every line agrees', () => {
    expect(findCommonIndent(['  alpha', '  beta'])).toBe('  ');
  });

  it('returns the shallowest indent when lines differ in depth', () => {
    expect(findCommonIndent(['  alpha', '    beta'])).toBe('  ');
  });

  it('returns no indent when a line starts at column zero', () => {
    expect(findCommonIndent(['  alpha', 'beta'])).toBe('');
  });

  it('compares characters rather than widths, so a tab never matches spaces', () => {
    expect(findCommonIndent(['\talpha', '        beta'])).toBe('');
  });

  it('matches a shared prefix of mixed tabs and spaces', () => {
    expect(findCommonIndent(['\t  alpha', '\t    beta'])).toBe('\t  ');
  });

  it('returns no indent for no lines', () => {
    expect(findCommonIndent([])).toBe('');
  });
});

describe(findLineIndent, () => {
  it('returns the leading run of tabs and spaces', () => {
    expect(findLineIndent(' \t alpha')).toBe(' \t ');
  });

  it.each(['\u{FEFF}', '\u{A0}', '\u{3000}'])('does not treat %j as indentation', (character) => {
    expect(findLineIndent(`${character}alpha`)).toBe('');
  });

  it('stops at the first character that is neither tab nor space', () => {
    expect(findLineIndent('  \u{A0}  alpha')).toBe('  ');
  });
});

describe(isBlankText, () => {
  it.each(['', ' ', '\t', ' \t '])('reports %j as blank', (text) => {
    expect(isBlankText(text)).toBe(true);
  });

  it.each(['alpha', '  alpha', '\u{A0}', '\u{FEFF}', '\u{3000}'])('reports %j as content', (text) => {
    expect(isBlankText(text)).toBe(false);
  });
});
