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
    expect(() => getValueAtPathOrThrow(obj, 'b')).toThrow('Missing key "b" in path "b"');
  });

  it('throws when a nested key does not exist', () => {
    const obj = { a: { b: {} } };
    expect(() => getValueAtPathOrThrow(obj, 'a.b.c')).toThrow('Missing key "c" in path "a.b.c"');
  });

  it('throws when the key is inherited from Object.prototype', () => {
    const obj = { a: 1 };
    expect(() => getValueAtPathOrThrow(obj, 'toString')).toThrow('Missing key "toString" in path "toString"');
  });

  it('resolves own fields of a class instance but not its prototype members', () => {
    class Config {
      name = 'root';

      get label(): string {
        return `<${this.name}>`;
      }
    }
    const instance = new Config();

    expect(getValueAtPathOrThrow(instance, 'name')).toBe('root');
    expect(() => getValueAtPathOrThrow(instance, 'label')).toThrow('Missing key "label" in path "label"');
  });

  it('throws when an array index is out of bounds', () => {
    const obj = { list: [1, 2, 3] };
    expect(() => getValueAtPathOrThrow(obj, 'list[5]')).toThrow('Array index out of bounds: "5" in path "list[5]"');
  });

  it('throws when given a non-integer array index', () => {
    const obj = { list: [1, 2, 3] };
    expect(() => getValueAtPathOrThrow(obj, 'list[foo]')).toThrow(
      'Expected array index at segment "foo" in path "list[foo]"',
    );
  });

  it('throws when the path hits a primitive unexpectedly', () => {
    const obj = { a: 42 };
    expect(() => getValueAtPathOrThrow(obj, 'a.b')).toThrow(
      'Unexpected non-object/non-array at segment "b" in path "a.b"',
    );
  });

  it('throws if the root is not an object', () => {
    expect(() => getValueAtPathOrThrow(null, 'a')).toThrow('Expected an object as root value.');
  });
});
