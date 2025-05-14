import { describe, expect, it } from 'vitest';

import { enclose } from '../enclose.ts';

describe(enclose, () => {
  const content = 'content';

  it('encloses the string in the delimiters', () => {
    const opening = '[';
    const closing = ']';
    const expected = '[content]';

    const actual = enclose(opening, closing)(content);

    expect(actual).toBe(expected);
  });

  it('if only the opening string is given, also uses it as the closing string', () => {
    const opening = '|';
    const expected = '|content|';

    const actual = enclose(opening)(content);

    expect(actual).toBe(expected);
  });
});
