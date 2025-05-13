import { describe, expect, it } from 'vitest';

import { replaceFileExtension } from '../replaceFileExtension.js';

describe('replaceFileExtension()', () => {
  it('replaces the current file extension with the new extension and returns the result', () => {
    const filePath = './path/to/file.old';
    const newExtension = '.new';
    const expected = './path/to/file.new';

    const result = replaceFileExtension(filePath, newExtension);

    expect(result).toBe(expected);
  });

  it('if a previous extension is specified, replaces that extension', () => {
    const filePath = './path/to/file.infix.old';
    const oldExtension = '.infix.old';
    const newExtension = '.new';
    const expected = './path/to/file.new';

    const result = replaceFileExtension(filePath, newExtension, { oldExtension });

    expect(result).toBe(expected);
  });

  it('if the file name does not have an extension, adds the new extension', () => {
    const filePath = './path/to/file';
    const newExtension = '.new';
    const expected = './path/to/file.new';

    const result = replaceFileExtension(filePath, newExtension);

    expect(result).toBe(expected);
  });

  it('if the replacement is blank, removes the extension', () => {
    const filePath = './path/to/file.old';
    const newExtension = '';
    const expected = './path/to/file';

    const result = replaceFileExtension(filePath, newExtension);

    expect(result).toBe(expected);
  });

  it('if the file name has no extension and the extension is blank, returns the original file path', () => {
    const filePath = './path/to/file';
    const newExtension = '';
    const expected = filePath;

    const result = replaceFileExtension(filePath, newExtension);

    expect(result).toBe(expected);
  });

  it('replaces the extension only at the end of the path', () => {
    const filePath = './path/to/file.old/other.file.old';
    const newExtension = '.new';
    const expected = './path/to/file.old/other.file.new';

    const result = replaceFileExtension(filePath, newExtension);

    expect(result).toBe(expected);
  });

  it('if the file name does not end with the specified extension, throws an error', () => {
    const filePath = './path/to/file.old';
    const oldExtension = '.ext';
    const newExtension = '';

    expect(() => replaceFileExtension(filePath, newExtension, { oldExtension })).toThrow(
      /File path ".*" does not end with extension/,
    );
  });
});
