import { describe, expect, it } from 'vitest';

import { serializableScalars } from '../../internal/primitives.fixture.ts';
import { isEqual } from '../isEqual.ts';

describe(isEqual, () => {
  it.each(serializableScalars)('returns true for $label', ({ value }) => {
    expect(isEqual(value, value)).toBe(true);
  });

  it('returns false for unequal primitives', () => {
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual('a', 'b')).toBe(false);
    expect(isEqual(true, false)).toBe(false);
    expect(isEqual(null, undefined)).toBe(false);
  });

  it('returns true for equal plain objects', () => {
    const aObj = { a: 1, b: 2 };
    const bObj = { b: 2, a: 1 };

    expect(isEqual(aObj, bObj)).toBe(true);
  });

  it('returns false for unequal plain objects', () => {
    const aObj = { a: 1, b: 2 };
    const bObj = { b: 2, a: 3 };

    expect(isEqual(aObj, bObj)).toBe(false);
  });

  it('returns true for equal nested objects', () => {
    const aObj = { a: 1, b: { x: 10, y: 20 }, c: 3 };
    const bObj = { c: 3, b: { y: 20, x: 10 }, a: 1 };

    expect(isEqual(aObj, bObj)).toBe(true);
  });

  it('returns false for unequal nested objects', () => {
    const aObj = { a: 1, b: { x: 10, y: 20 }, c: 3 };
    const bObj = { c: 3, b: { y: 20, x: 15 }, a: 1 };

    expect(isEqual(aObj, bObj)).toBe(false);
  });

  it('returns true for equal arrays', () => {
    const aArray = [1, 2, 3];
    const bArray = [1, 2, 3];

    expect(isEqual(aArray, bArray)).toBe(true);
  });

  it('returns false for unequal arrays', () => {
    const aArray = [1, 2];
    const bArray = [2, 1];

    expect(isEqual(aArray, bArray)).toBe(false);
  });
});
