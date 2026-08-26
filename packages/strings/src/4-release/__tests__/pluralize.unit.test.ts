import { describe, expect, it } from 'vitest';

import { pluralize, pluralizeWithCount } from '../pluralize.ts';

describe(pluralize, () => {
  it('returns the singular form for a count of 1', () => {
    expect(pluralize(1, 'apple')).toBe('apple');
  });

  it('returns the singular form for a count of -1', () => {
    expect(pluralize(-1, 'apple')).toBe('apple');
  });

  it('returns the plural form for any other count', () => {
    expect(pluralize(0, 'apple')).toBe('apples');
    expect(pluralize(1.1, 'apple')).toBe('apples');
    expect(pluralize(2, 'apple')).toBe('apples');
  });

  it('returns the plural form for a non-finite count', () => {
    expect(pluralize(NaN, 'apple')).toBe('apples');
    expect(pluralize(Infinity, 'apple')).toBe('apples');
  });

  it('uses a custom plural form if given', () => {
    expect(pluralize(2, 'child', 'children')).toBe('children');
  });
});

describe(pluralizeWithCount, () => {
  it('returns the singular form with count for a count of 1', () => {
    expect(pluralizeWithCount(1, 'apple')).toBe('1 apple');
  });

  it('returns the singular form with count for a count of -1', () => {
    expect(pluralizeWithCount(-1, 'apple')).toBe('-1 apple');
  });

  it('returns the plural form with count for any other count', () => {
    expect(pluralizeWithCount(0, 'apple')).toBe('0 apples');
    expect(pluralizeWithCount(1.1, 'apple')).toBe('1.1 apples');
  });

  it('returns the plural form with count for a non-finite count', () => {
    expect(pluralizeWithCount(NaN, 'apple')).toBe('NaN apples');
    expect(pluralizeWithCount(Infinity, 'apple')).toBe('Infinity apples');
  });

  it('interpolates the count as given, without grouping separators', () => {
    expect(pluralizeWithCount(1_234, 'apple')).toBe('1234 apples');
  });

  it('uses a custom plural form if given', () => {
    expect(pluralizeWithCount(2, 'child', 'children')).toBe('2 children');
  });
});
