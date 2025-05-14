import { assertEquals, assertThrows, describe, it } from '../../dev_deps.ts';

import { slugify } from '../slugify.ts';

describe('slugify()', () => {
  it('converts simple strings correctly', () => {
    const input = 'Hello, World';
    const expected = 'hello-world';

    const actual = slugify(input);

    assertEquals(actual, expected);
  });

  it('handles diacritics and accented characters', () => {
    const input = 'jalapeño';
    const expected = 'jalapeno';

    const actual = slugify(input);

    assertEquals(actual, expected);
  });

  it('removes special characters', () => {
    const input = 'Hello!@#$%^&*()_+World';
    const expected = 'hello-world';

    const actual = slugify(input);

    assertEquals(actual, expected);
  });

  it('replaces periods with default separator', () => {
    const input = 'Hello.World';
    const expected = 'hello-world';

    const actual = slugify(input);

    assertEquals(actual, expected);
  });

  it('uses custom separator when provided', () => {
    const input = 'Hello, World';
    const options = { separator: '_' };
    const expected = 'hello_world';

    const actual = slugify(input, options);

    assertEquals(actual, expected);
  });

  it('handles numbers in input', () => {
    const input = 'Hello 2023, World';
    const expected = 'hello-2023-world';

    const actual = slugify(input);

    assertEquals(actual, expected);
  });

  it('correctly processes array input', () => {
    const input = ['Hello', 2023, 'World'];
    const expected = 'hello-2023-world';

    const actual = slugify(input);

    assertEquals(actual, expected);
  });

  it('ignores leading, trailing, and intervening spaces', () => {
    const input = '   Hello  ,  World   ';
    const expected = 'hello-world';

    const actual = slugify(input);

    assertEquals(actual, expected);
  });

  it('if separator is longer than one character, throws an error', () => {
    const input = 'Hello, World';
    const options = { separator: '!!' };

    const throwingFn = () => slugify(input, options);

    assertThrows(
      throwingFn,
      Error,
      'Separator must be a single character.',
    );
  });
});
