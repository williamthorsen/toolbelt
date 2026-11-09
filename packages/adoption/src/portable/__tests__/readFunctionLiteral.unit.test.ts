import { describe, expect, it } from 'vitest';

import { readFunctionLiteral } from '../readFunctionLiteral.ts';

describe(readFunctionLiteral, () => {
  it('reads a bare-parameter arrow', () => {
    expect(readFunctionLiteral('value => value + 1')).toStrictEqual({ body: ' value + 1', parameters: 'value' });
  });

  it('reads a parenthesized arrow', () => {
    expect(readFunctionLiteral('(a, b) => a - b')).toStrictEqual({ body: ' a - b', parameters: 'a, b' });
  });

  it('reads an anonymous function expression from its body brace to the end of the text', () => {
    expect(readFunctionLiteral('function (a) { return a; }, rest')).toStrictEqual({
      body: '{ return a; }, rest',
      parameters: 'a',
    });
  });

  it('reads a named function expression', () => {
    expect(readFunctionLiteral('function compare(a, b) { return 0; }')?.parameters).toBe('a, b');
  });

  it('skips leading whitespace', () => {
    expect(readFunctionLiteral('  () => 0')).toStrictEqual({ body: ' 0', parameters: '' });
  });

  it('reads an arrow past its return-type annotation', () => {
    expect(readFunctionLiteral('(x): number => x')).toStrictEqual({ body: ' x', parameters: 'x' });
  });

  it('reads a function past its return-type annotation', () => {
    expect(readFunctionLiteral('function (x): void {}')).toStrictEqual({ body: '{}', parameters: 'x' });
  });

  it('reads a function body past braces inside its parameter list', () => {
    expect(readFunctionLiteral('function ({ a }: { a: number }) { return a; }')?.body).toBe('{ return a; }');
  });

  it('accepts an arrow whose sole parameter is named async', () => {
    expect(readFunctionLiteral('async => async')?.parameters).toBe('async');
  });

  describe('declines', () => {
    it.each([
      ['an async arrow', 'async (x) => x'],
      ['an async bare-parameter arrow', 'async x => x'],
      ['an async function', 'async function (x) { return x; }'],
      ['a bare reference', 'compare'],
      ['a parenthesized value with no arrow', '(compare)'],
      ['a type-parameter list ahead of an arrow', '<T>(x: T) => x'],
      ['a function without a body', 'function (x) x'],
      ['a function whose body never balances', 'function (x) { return x;'],
      ['a function whose parameter list never balances', 'function (x { return x; }'],
    ])('%s', (_label, text) => {
      expect(readFunctionLiteral(text)).toBeUndefined();
    });
  });
});
