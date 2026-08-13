import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

import { isError } from '../isError.ts';

describe(isError, () => {
  it('returns true for an Error and for a subclass of one', () => {
    class ParseFailure extends Error {}

    expect([
      isError(new Error('connection refused')),
      isError(new TypeError('bad type')),
      isError(new ParseFailure()),
    ]).toStrictEqual([true, true, true]);
  });

  it('returns true for an AggregateError', () => {
    expect(isError(new AggregateError([], 'all failed'))).toBe(true);
  });

  it('returns true for an Error thrown in another realm', () => {
    const foreignError: unknown = vm.runInNewContext('new Error("connection refused")');
    const foreignSubclass: unknown = vm.runInNewContext('class ParseFailure extends Error {}; new ParseFailure()');

    expect([foreignError instanceof Error, isError(foreignError), isError(foreignSubclass)]).toStrictEqual([
      false,
      true,
      true,
    ]);
  });

  it('returns true for a DOMException, which carries a tag of its own', () => {
    const aborted = new DOMException('aborted', 'AbortError');

    expect([Object.prototype.toString.call(aborted), isError(aborted)]).toStrictEqual(['[object DOMException]', true]);
  });

  it('returns false for a value that is not an Error', () => {
    expect([
      isError('connection refused'),
      isError({ message: 'connection refused' }),
      isError(undefined),
      isError(null),
    ]).toStrictEqual([false, false, false, false]);
  });

  it('returns false for an object merely shaped like an Error', () => {
    expect([
      isError({ message: 'connection refused', name: 'Error', stack: 'at read' }),
      isError(Object.create(null)),
    ]).toStrictEqual([false, false]);
  });
});
