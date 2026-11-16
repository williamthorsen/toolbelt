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

  it('given capitalized and uppercase words, lowercases them before capitalizing each word after the first', () => {
    const input = 'Hello WORLD';
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

  it('treats an existing case transition as a word boundary', () => {
    const input = 'helloWorld';
    const expected = 'helloWorld';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });

  it('capitalizes an acronym as one word', () => {
    const input = 'parseHTMLString';
    const expected = 'parseHtmlString';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });

  it('drops characters that are neither letters nor digits and treats them as word boundaries', () => {
    const input = 'a.b (c/d)';
    const expected = 'aBCD';

    const actual = toCamelCase(input);

    expect(actual).toBe(expected);
  });
});
