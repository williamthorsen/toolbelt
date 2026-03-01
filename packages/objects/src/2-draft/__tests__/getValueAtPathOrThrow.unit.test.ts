import { describe, expect, it } from 'vitest';

import { getValueAtPathOrThrow } from '../getValueAtPathOrThrow.ts';

describe(getValueAtPathOrThrow, () => {
  it('retrieves a top-level key', () => {
    const obj = { a: 1 };
    expect(getValueAtPathOrThrow(obj, 'a')).toBe(1);
  });

  it('retrieves a deeply nested key with dot notation', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(getValueAtPathOrThrow(obj, 'a.b.c')).toBe(42);
  });

  it('retrieves a nested key with bracket notation', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(getValueAtPathOrThrow(obj, 'a[b][c]')).toBe(42);
  });

  it('retrieves an array element by index', () => {
    const obj = { list: [10, 20, 30] };
    expect(getValueAtPathOrThrow(obj, 'list[1]')).toBe(20);
  });

  it('retrieves nested properties inside arrays', () => {
    const obj = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
    expect(getValueAtPathOrThrow(obj, 'users[1].name')).toBe('Bob');
  });

  it('throws when the top-level key does not exist', () => {
    const obj = { a: 1 };
    expect(() => getValueAtPathOrThrow(obj, 'b')).toThrowError('Missing key "b" in path "b"');
  });

  it('throws when a nested key does not exist', () => {
    const obj = { a: { b: {} } };
    expect(() => getValueAtPathOrThrow(obj, 'a.b.c')).toThrowError('Missing key "c" in path "a.b.c"');
  });

  it('throws when an array index is out of bounds', () => {
    const obj = { list: [1, 2, 3] };
    expect(() => getValueAtPathOrThrow(obj, 'list[5]')).toThrowError(
      'Array index out of bounds: "5" in path "list[5]"',
    );
  });

  it('throws when given a non-integer array index', () => {
    const obj = { list: [1, 2, 3] };
    expect(() => getValueAtPathOrThrow(obj, 'list[foo]')).toThrowError(
      'Expected array index at segment "foo" in path "list[foo]"',
    );
  });

  it('throws when the path hits a primitive unexpectedly', () => {
    const obj = { a: 42 };
    expect(() => getValueAtPathOrThrow(obj, 'a.b')).toThrowError(
      'Unexpected non-object/non-array at segment "b" in path "a.b"',
    );
  });

  it('throws if the root is not an object', () => {
    expect(() => getValueAtPathOrThrow(null, 'a')).toThrowError('Expected an object as root value.');
  });
});
