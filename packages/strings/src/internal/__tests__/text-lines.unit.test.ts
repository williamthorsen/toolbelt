import { describe, expect, it } from 'vitest';

import { joinLines, splitLines } from '../text-lines.ts';

describe(splitLines, () => {
  it('pairs each line with the terminator that followed it', () => {
    expect(splitLines('a\nb')).toStrictEqual([
      { terminator: '\n', text: 'a' },
      { terminator: '', text: 'b' },
    ]);
  });

  it('recognizes CRLF as a single terminator rather than two', () => {
    expect(splitLines('a\r\nb')).toStrictEqual([
      { terminator: '\r\n', text: 'a' },
      { terminator: '', text: 'b' },
    ]);
  });

  it.each(['\r', '\u{2028}', '\u{2029}'])('recognizes %j as a terminator', (terminator) => {
    expect(splitLines(`a${terminator}b`)).toStrictEqual([
      { terminator, text: 'a' },
      { terminator: '', text: 'b' },
    ]);
  });

  it('treats a trailing terminator as ending a final empty line', () => {
    expect(splitLines('a\n')).toStrictEqual([
      { terminator: '\n', text: 'a' },
      { terminator: '', text: '' },
    ]);
  });

  it('returns a single empty line for empty text', () => {
    expect(splitLines('')).toStrictEqual([{ terminator: '', text: '' }]);
  });
});

describe(joinLines, () => {
  it.each([
    'alpha\nbeta\n',
    'alpha\r\nbeta\r\n',
    'alpha\rbeta\r',
    'alpha\r\nbeta\ngamma\u{2028}delta\u{2029}epsilon',
    'alpha',
    '',
  ])('round-trips %j unchanged', (text) => {
    expect(joinLines(splitLines(text))).toBe(text);
  });
});
