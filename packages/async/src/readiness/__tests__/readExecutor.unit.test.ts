import { describe, expect, it } from 'vitest';

import { readExecutor } from '../readExecutor.ts';

describe(readExecutor, () => {
  it('reads a parenthesized arrow', () => {
    expect(readExecutor('(resolve) => settle(resolve)')).toStrictEqual({
      body: 'settle(resolve)',
      parameter: 'resolve',
    });
  });

  it('reads a bare-parameter arrow', () => {
    expect(readExecutor('resolve => settle(resolve)')).toStrictEqual({
      body: 'settle(resolve)',
      parameter: 'resolve',
    });
  });

  it('strips the braces of a block body, so a concise arrow and a braced one read alike', () => {
    expect(readExecutor('(resolve) => { settle(resolve); }')?.body).toBe(' settle(resolve); ');
  });

  it('reads an anonymous function expression', () => {
    expect(readExecutor('function (resolve) { settle(resolve); }')).toStrictEqual({
      body: ' settle(resolve); ',
      parameter: 'resolve',
    });
  });

  it('reads a named function expression', () => {
    expect(readExecutor('function sleep(resolve) { settle(resolve); }')?.parameter).toBe('resolve');
  });

  it('reads the name of a parameter with a type annotation', () => {
    expect(readExecutor('(resolve: () => void) => settle(resolve)')?.parameter).toBe('resolve');
  });

  it('reads the first parameter alone, a second being none of its business', () => {
    expect(readExecutor('(resolve, reject) => settle(resolve)')?.parameter).toBe('resolve');
  });

  it('reports an empty parameter where the function takes none', () => {
    expect(readExecutor('() => settle()')).toStrictEqual({ body: 'settle()', parameter: '' });
  });

  it('declines a bare reference, whose body is not here to read', () => {
    expect(readExecutor('settle')).toBeUndefined();
  });

  it('declines a parenthesized value that is no function literal', () => {
    expect(readExecutor('(settle)')).toBeUndefined();
  });

  it('declines a destructured parameter, which names nothing to call', () => {
    expect(readExecutor('({ resolve }) => settle(resolve)')).toBeUndefined();
  });
});
