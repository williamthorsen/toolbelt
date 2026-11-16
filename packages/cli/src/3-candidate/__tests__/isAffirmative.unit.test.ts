import { describe, expect, it } from 'vitest';

import { isAffirmative } from '../isAffirmative.ts';

describe(isAffirmative, () => {
  it.each(['y', 'yes', 'Y', 'YeS', ' yes\n'])('accepts %o', (answer) => {
    expect(isAffirmative(answer)).toBe(true);
  });

  it.each([undefined, '', 'n', 'no', 'yess', 'ye s'])('rejects %o', (answer) => {
    expect(isAffirmative(answer)).toBe(false);
  });
});
