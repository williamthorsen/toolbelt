import { describe, expect, it } from 'vitest';

import { toCamelCase } from '../toCamelCase.ts';

describe(toCamelCase, () => {
  it('lowercases the first word and capitalizes every word thereafter', () => {
    const input = 'HELLO   WORLD I AM HERE';
    const expected = 'helloWorldIAmHere';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });

  it('keeps single word strings in lowercase', () => {
    const input = 'WORLD';
    const expected = 'world';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });

  it('ignores leading, trailing, and intervening spaces', () => {
    const input = '   HELLO    WORLD   ';
    const expected = 'helloWorld';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });

  it('works correctly with mixed case strings', () => {
    const input = 'hELLo WoRLd';
    const expected = 'helloWorld';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });

  it('capitalizes the letter after kebab-case & snake_case separators and removes the separators', () => {
    const input = 'kebab-case_and_snake_case';
    const expected = 'kebabCaseAndSnakeCase';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });

  it('does not preserve existing camel casing', () => {
    const input = 'helloWorld';
    const expected = 'helloworld';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });
});
