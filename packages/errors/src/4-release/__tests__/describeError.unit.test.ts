/* eslint unicorn/error-message: off -- the message-less `Error` is the subject of the empty-message tests. */

import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

import { describeError } from '../describeError.ts';

describe(describeError, () => {
  it('returns the message of an Error', () => {
    expect(describeError(new Error('connection refused'))).toBe('connection refused');
  });

  it('returns the message of an Error thrown in another realm', () => {
    const foreignError: unknown = vm.runInNewContext('new Error("connection refused")');

    expect(describeError(foreignError)).toBe('connection refused');
  });

  it('describes an Error carrying no message by its name', () => {
    expect(describeError(new Error())).toBe('Error');
  });

  it('describes a message-less subclass by the name it assigns', () => {
    class ConfigError extends Error {
      override name = 'ConfigError';
    }

    expect(describeError(new ConfigError())).toBe('ConfigError');
  });

  it('stringifies a value that is not an Error', () => {
    const descriptions = [
      describeError('plain string'),
      describeError(42),
      describeError(undefined),
      describeError(null),
    ];

    expect(descriptions).toStrictEqual(['plain string', '42', 'undefined', 'null']);
  });

  it('stringifies an Error whose message is not a string', () => {
    const error = new Error();
    Object.defineProperty(error, 'message', { value: { code: 500 } });

    expect(describeError(error)).toBe('Error: [object Object]');
  });

  it('describes a null-prototype object, which cannot be coerced to a primitive', () => {
    expect(describeError(Object.create(null))).toBe('[unstringifiable value]');
  });

  it('describes an Error whose message accessor throws', () => {
    class LazyError extends Error {
      override get message(): string {
        throw new Error('accessor failed');
      }
    }

    expect(describeError(new LazyError())).toBe('[unstringifiable value]');
  });

  it('describes a value whose toString throws', () => {
    const hostile = {
      toString(): string {
        throw new Error('boom');
      },
    };

    expect(describeError(hostile)).toBe('[unstringifiable value]');
  });
});
