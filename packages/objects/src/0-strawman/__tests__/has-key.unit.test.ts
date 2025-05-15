import { describe, expect, it } from 'vitest';

import { hasKeyAtPath } from '../has-key.ts';

describe(hasKeyAtPath, () => {
  it('returns true when the top-level key exists', () => {
    const obj = { a: 1 };
    expect(hasKeyAtPath(obj, ['a'])).toBe(true);
  });

  it('returns false when the top-level key does not exist', () => {
    const obj = { a: 1 };
    expect(hasKeyAtPath(obj, ['b'])).toBe(false);
  });

  it('returns true when the full nested key path exists', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(hasKeyAtPath(obj, ['a', 'b', 'c'])).toBe(true);
  });

  it('returns false when a nested key is missing in the path', () => {
    const obj = { a: { b: {} } };
    expect(hasKeyAtPath(obj, ['a', 'b', 'c'])).toBe(false);
  });

  it('returns false when the initial object is empty', () => {
    const obj = {};
    expect(hasKeyAtPath(obj, ['a'])).toBe(false);
  });

  it('returns false when an intermediate key resolves to undefined', () => {
    const obj = { a: undefined };
    expect(hasKeyAtPath(obj, ['a', 'b'])).toBe(false);
  });

  it('treats null intermediate objects as missing', () => {
    const obj = { a: null };
    expect(hasKeyAtPath(obj, ['a', 'b'])).toBe(false);
  });

  it('returns false for empty key path', () => {
    const obj = { a: 1 };
    expect(hasKeyAtPath(obj, [])).toBe(false);
  });

  it('returns true if the last key exists but is undefined', () => {
    const obj = { a: { b: undefined } };
    expect(hasKeyAtPath(obj, ['a', 'b'])).toBe(true);
  });

  it('handles arrays as objects', () => {
    const obj = { list: [1, 2, 3] };
    expect(hasKeyAtPath(obj, ['list', '0'])).toBe(true);
    expect(hasKeyAtPath(obj, ['list', '3'])).toBe(false);
  });
});
