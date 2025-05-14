import { assertEquals, assertThrows, describe, it } from '../../dev_deps.ts';
import { splitDelimited } from '../splitDelimited.ts';

describe('splitDelimited', () => {
  const params = { opening: '{', closing: '}', separator: '|' };

  it('removes the delimiters and splits on the separator', () => {
    const input = '{firstName|lastName}';
    const expected = ['firstName', 'lastName'];

    const actual = splitDelimited(input, params);

    assertEquals(actual, expected);
  });

  it('ignores separators in delimited substrings', () => {
    const input = '{1{A|B}|2|3{C|D}}';
    const expected = ['1{A|B}', '2', '3{C|D}'];

    const actual = splitDelimited(input, params);

    assertEquals(actual, expected);
  });

  it('given an undelimited string, throws an error', () => {
    const input = 'Hello, world!';

    const throwingFn = () => splitDelimited(input, params);

    assertThrows(throwingFn, Error, 'Expected a string delimited by "{" and "}".');
  });
});
