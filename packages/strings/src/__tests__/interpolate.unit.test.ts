import { describe, expect, it } from 'vitest';

import { interpolate } from '../interpolate.js';

describe('interpolate()', () => {
  it('when a placeholder matches a key in the dictionary, replaces the placeholder with the corresponding value', () => {
    const input = 'Hello, {name}!';
    const dictionary = { name: 'World' };
    const expectedOutput = 'Hello, World!';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });

  it('when a placeholder does not match any key in the dictionary, leaves the placeholder unchanged', () => {
    const input = 'Hello, {name}!';
    const dictionary = { greeting: 'Hi' };
    const expectedOutput = 'Hello, {name}!';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });

  it('when a placeholder does not match any key in the dictionary and fallBackToPlaceholder=true, use the placeholder itself', () => {
    const input = 'Hello, {name}!';
    const dictionary = { greeting: 'Hi' };
    const expectedOutput = 'Hello, name!';

    const output = interpolate(input, dictionary, { missingKeyBehavior: 'replace' });

    expect(output).toBe(expectedOutput);
  });

  it('when multiple occurrences of a placeholder match a key in the dictionary, replaces all occurrences with the corresponding value', () => {
    const input = '{delimiter}Hello, {name}!{delimiter}';
    const dictionary = { name: 'World', delimiter: '|' };
    const expectedOutput = '|Hello, World!|';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });

  it('when a placeholder is empty, leaves the placeholder unchanged', () => {
    const input = 'Hello, {}!';
    const dictionary = { name: 'World' };
    const expectedOutput = 'Hello, {}!';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });

  it('when the input is an empty string, returns an empty string', () => {
    const input = '';
    const dictionary = { name: 'World' };
    const expectedOutput = '';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });

  it('when the dictionary is empty, leaves all placeholders unchanged', () => {
    const input = 'Hello, {name}!';
    const dictionary = {};
    const expectedOutput = 'Hello, {name}!';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });

  it('accepts placeholders containing underscores', () => {
    const input = 'Hello, {name_1}!';
    const dictionary = { name_1: 'World' };
    const expectedOutput = 'Hello, World!';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });

  it('ignores placeholders that start with a number', () => {
    const input = 'Hello, {1name}!';
    const dictionary = { '1name': 'World' };
    const expectedOutput = 'Hello, {1name}!';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });

  it('ignores placeholders that include a space', () => {
    const input = 'Hello, {name with space}!';
    const dictionary = { 'name with space': 'World' };
    const expectedOutput = 'Hello, {name with space}!';

    const output = interpolate(input, dictionary);

    expect(output).toBe(expectedOutput);
  });
});
