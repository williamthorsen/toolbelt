import { assertEquals, describe, it } from '../../dev_deps.ts';
import { segmentByDelimited } from '../segmentByDelimited.ts';

describe('segmentByDelimited()', () => {
  const params = { opening: '[', closing: ']' };

  it('treats delimited substrings as segment boundaries and returns an array of segments', () => {
    const input = 'Warm [greetings|hello], [stranger|world]!';
    const expected = [
      'Warm ',
      '[greetings|hello]',
      ', ',
      '[stranger|world]',
      '!',
    ];

    const output = segmentByDelimited(input, params);

    assertEquals(output, expected);
  });

  it('does not treat nested delimited phrases as segment boundaries', () => {
    const input = '[[[despite nesting, this|forms]|a|single|segment]';
    const expected = [
      '[[[despite nesting, this|forms]|a|single|segment]',
    ];

    const output = segmentByDelimited(input, params);

    assertEquals(output, expected);
  });

  it('treats a string without delimiters as a single segment', () => {
    const input = 'Hello, world!';
    const expected = ['Hello, world!'];

    const output = segmentByDelimited(input, params);

    assertEquals(output, expected);
  });

  it('allows empty delimiters', () => {
    const input = 'Hello, []world!';
    const expected = ['Hello, ', '[]', 'world!'];

    const output = segmentByDelimited(input, params);

    assertEquals(output, expected);
  });
});
