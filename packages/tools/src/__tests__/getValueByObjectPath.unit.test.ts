import { describe, expect, it } from 'vitest';

import { getValueByObjectPath } from '../getValueByObjectPath.js';

describe('getValueByObjectPath()', () => {
  const testObject = {
    a: {
      b: {
        c: 'value',
      },
    },
  };

  it('if the object path exists, returns the value at that path', () => {
    const objectPath = 'a.b.c';
    const expectedValue = testObject.a.b.c;

    const value = getValueByObjectPath(testObject, objectPath);

    expect(value).toBe(expectedValue);
  });

  it('if the object path does not exist, throws an error', () => {
    const badObjectPath = 'a.b.d';

    expect(
      () => getValueByObjectPath(testObject, badObjectPath)
    ).toThrow(/Could not get value at path.*: Path not found/);
  });

  describe('invalid paths', () => {
    const badPaths = [
      '.b.c',
      'a..c',
      'a.b.',
    ];
    it.each(badPaths)('if path segment is empty as in %s, throws an error', (badObjectPath) => {
      expect(
        () => getValueByObjectPath(testObject, badObjectPath)
      ).toThrow(/Could not get value at path.*: Malformed object path/);
    });
  });
});
