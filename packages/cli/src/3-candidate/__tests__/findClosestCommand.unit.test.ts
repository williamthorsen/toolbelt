import { describe, expect, it } from 'vitest';

import { findClosestCommand } from '../findClosestCommand.ts';

const commands = ['build', 'check', 'list', 'sync', 'test'];

describe(findClosestCommand, () => {
  it.each([
    ['an adjacent transposition', 'chekc', 'check'],
    ['a substitution', 'buidl', 'build'],
    ['a substitution in place', 'tast', 'test'],
    ['an insertion', 'syncc', 'sync'],
    ['a deletion within the limit', 'syn', 'sync'],
  ])('suggests the command for %s', (_case, token, expected) => {
    expect(findClosestCommand(token, commands)).toBe(expected);
  });

  it('suggests nothing for a token farther than two edits away', () => {
    expect(findClosestCommand('deploy', commands)).toBeUndefined();
  });

  it('suggests nothing when the distance is not less than the token length', () => {
    expect(findClosestCommand('ls', ['ls-files', 'cd'])).toBeUndefined();
    expect(findClosestCommand('x', ['a'])).toBeUndefined();
  });

  it('breaks a tie in favour of the alphabetically first command', () => {
    expect(findClosestCommand('bat', ['cat', 'bar'])).toBe('bar');
    expect(findClosestCommand('bat', ['bar', 'cat'])).toBe('bar');
  });
});
