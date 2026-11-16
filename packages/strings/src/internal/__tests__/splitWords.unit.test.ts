import { describe, expect, it } from 'vitest';

import { splitWords } from '../splitWords.ts';

describe(splitWords, () => {
  it.each([
    ['hello world', ['hello', 'world']],
    ['  kebab-case_and.dotted/path  ', ['kebab', 'case', 'and', 'dotted', 'path']],
    ['Darcula (Custom)', ['Darcula', 'Custom']],
  ])('splits %j on runs of characters that are neither letters nor digits', (input, expected) => {
    expect(splitWords(input)).toStrictEqual(expected);
  });

  it.each([
    ['dryRun', ['dry', 'Run']],
    ['DryRun', ['Dry', 'Run']],
    ['v2Beta', ['v2', 'Beta']],
    ['überFlag', ['über', 'Flag']],
  ])('splits %j before a capital that follows a lowercase letter or digit', (input, expected) => {
    expect(splitWords(input)).toStrictEqual(expected);
  });

  it.each([
    ['parseHTMLString', ['parse', 'HTML', 'String']],
    ['HTML', ['HTML']],
    ['HTML5Parser', ['HTML5', 'Parser']],
  ])('keeps the acronym in %j whole', (input, expected) => {
    expect(splitWords(input)).toStrictEqual(expected);
  });

  it.each([
    ['version2', ['version2']],
    ['ipv6Only', ['ipv6', 'Only']],
  ])('does not split %j between a letter and a digit', (input, expected) => {
    expect(splitWords(input)).toStrictEqual(expected);
  });

  it('treats a letter without case as lowercase', () => {
    expect(splitWords('日本Go')).toStrictEqual(['日本', 'Go']);
  });

  it.each(['', '  ', '-_./'])('returns no words for %j', (input) => {
    expect(splitWords(input)).toStrictEqual([]);
  });
});
