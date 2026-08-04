import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify.ts';

describe(slugify, () => {
  it('converts simple strings correctly', () => {
    const input = 'Hello, World';
    const expected = 'hello-world';

    const actual = slugify(input);

    expect(actual).toBe(expected);
  });

  it('handles diacritics and accented characters', () => {
    const input = 'jalapeño';
    const expected = 'jalapeno';

    const actual = slugify(input);

    expect(actual).toBe(expected);
  });

  it('removes special characters', () => {
    const input = 'Hello!@#$%^&*()_+World';
    const expected = 'hello-world';

    const actual = slugify(input);

    expect(actual).toBe(expected);
  });

  it('replaces periods with default separator', () => {
    const input = 'Hello.World';
    const expected = 'hello-world';

    const actual = slugify(input);

    expect(actual).toBe(expected);
  });

  it('uses custom separator when provided', () => {
    const input = 'Hello, World';
    const options = { separator: '_' };
    const expected = 'hello_world';

    const actual = slugify(input, options);

    expect(actual).toBe(expected);
  });

  it('handles numbers in input', () => {
    const input = 'Hello 2023, World';
    const expected = 'hello-2023-world';

    const actual = slugify(input);

    expect(actual).toBe(expected);
  });

  it('correctly processes array input', () => {
    const input = ['Hello', 2_023, 'World'];
    const expected = 'hello-2023-world';

    const actual = slugify(input);

    expect(actual).toBe(expected);
  });

  it('ignores leading, trailing, and intervening spaces', () => {
    const input = '   Hello  ,  World   ';
    const expected = 'hello-world';

    const actual = slugify(input);

    expect(actual).toBe(expected);
  });

  it('given a letter separator, still removes special characters', () => {
    const input = 'Hello, Wörld! #42';
    const options = { separator: 'c' };
    const expected = 'hellocworldc42';

    const actual = slugify(input, options);

    expect(actual).toBe(expected);
  });

  it('given a regex-special separator, inserts it literally', () => {
    const input = 'Hello, World';
    const options = { separator: '.' };
    const expected = 'hello.world';

    const actual = slugify(input, options);

    expect(actual).toBe(expected);
  });

  it('if separator is longer than one character, throws an error', () => {
    const input = 'Hello, World';
    const options = { separator: '!!' };

    const throwingFn = () => slugify(input, options);

    expect(throwingFn).toThrow('Separator must be a single character.');
  });
});
