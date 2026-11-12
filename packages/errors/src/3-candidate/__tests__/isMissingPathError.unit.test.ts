import { describe, expect, expectTypeOf, it } from 'vitest';

import { isMissingPathError } from '../isMissingPathError.ts';

describe(isMissingPathError, () => {
  it('returns true for an Error whose code is ENOENT or ENOTDIR', () => {
    expect([
      isMissingPathError(Object.assign(new Error('no such file or directory'), { code: 'ENOENT' })),
      isMissingPathError(Object.assign(new Error('not a directory'), { code: 'ENOTDIR' })),
    ]).toStrictEqual([true, true]);
  });

  it('returns true for a plain object whose code is ENOENT or ENOTDIR', () => {
    expect([isMissingPathError({ code: 'ENOENT' }), isMissingPathError({ code: 'ENOTDIR' })]).toStrictEqual([
      true,
      true,
    ]);
  });

  it('returns false for an error with any other code', () => {
    expect([
      isMissingPathError(Object.assign(new Error('permission denied'), { code: 'EACCES' })),
      isMissingPathError({ code: 'EISDIR' }),
      isMissingPathError({ code: 2 }),
    ]).toStrictEqual([false, false, false]);
  });

  it('returns false for a value without a code', () => {
    expect([
      isMissingPathError(new Error('ENOENT')),
      isMissingPathError('ENOENT'),
      isMissingPathError(undefined),
      isMissingPathError(null),
    ]).toStrictEqual([false, false, false, false]);
  });

  it('narrows a value that it accepts to its code', () => {
    expectTypeOf(isMissingPathError).guards.toEqualTypeOf<{ readonly code: 'ENOENT' | 'ENOTDIR' }>();
  });
});
