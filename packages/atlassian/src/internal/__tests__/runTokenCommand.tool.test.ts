import { describe, expect, it } from 'vitest';

import { runTokenCommand } from '../runTokenCommand.ts';

describe(runTokenCommand, () => {
  it('returns what the command printed, without its trailing newline', () => {
    expect(runTokenCommand(String.raw`printf "a-token\n"`)).toBe('a-token');
  });

  it('keeps interior newlines', () => {
    expect(runTokenCommand(String.raw`printf "one\ntwo\n"`)).toBe('one\ntwo');
  });

  it('throws naming the command and its stderr on a non-zero exit', () => {
    expect(() => runTokenCommand('printf "denied" >&2; exit 3')).toThrow(/exited 3: denied/);
  });
});
