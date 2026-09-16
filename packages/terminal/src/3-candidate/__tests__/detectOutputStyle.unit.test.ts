import { describe, expect, it } from 'vitest';

import { detectOutputStyle } from '../detectOutputStyle.ts';

// An environment naming neither CI nor a terminal type, leaving the TTY flag to decide on its own.
const BARE_ENV = {};

const PIPE = false;
const TTY = true;

describe(detectOutputStyle, () => {
  it('chooses rich for a terminal outside CI', () => {
    expect(detectOutputStyle({ env: BARE_ENV, isTty: TTY })).toBe('rich');
  });

  it('chooses plain where the output is not a terminal', () => {
    expect(detectOutputStyle({ env: BARE_ENV, isTty: PIPE })).toBe('plain');
  });

  it.each(['1', 'true', 'yes', 'anything'])('reads CI=%s as a runner, which gives plain', (value) => {
    expect(detectOutputStyle({ env: { CI: value }, isTty: TTY })).toBe('plain');
  });

  it.each(['', 'false'])('reads CI=%s as a denial, leaving the terminal to decide', (value) => {
    expect(detectOutputStyle({ env: { CI: value }, isTty: TTY })).toBe('rich');
  });

  it('reads CI=False as a runner, the denial matching exactly', () => {
    expect(detectOutputStyle({ env: { CI: 'False' }, isTty: TTY })).toBe('plain');
  });

  it('chooses plain on the Linux virtual console, which is itself a terminal', () => {
    expect(detectOutputStyle({ env: { TERM: 'linux' }, isTty: TTY })).toBe('plain');
  });

  it.each(['dumb', 'xterm-256color'])('ignores TERM=%s', (term) => {
    expect(detectOutputStyle({ env: { TERM: term }, isTty: TTY })).toBe('rich');
  });

  it('ignores NO_COLOR, whose specification covers colour alone', () => {
    expect(detectOutputStyle({ env: { NO_COLOR: '1' }, isTty: TTY })).toBe('rich');
  });
});
