import { describe, expect, it } from 'vitest';

import { toSortableName } from '../toSortableName.ts';

describe(toSortableName, () => {
  const name = 'John Doe Smith';

  it('if index is 0, returns the original string', () => {
    const index = 0;
    const expected = 'John Doe Smith';

    const actual = toSortableName(name, index);

    expect(actual).toBe(expected);
  });

  it('if index is > 0, moves all parts with a lower index to the end', () => {
    const index = 1;
    const expected = 'Doe Smith John';

    const actual = toSortableName(name, index);

    expect(actual).toBe(expected);
  });

  it('uses a custom separator if given', () => {
    const index = 2;
    const expected = 'Smith, John Doe';

    const actual = toSortableName(name, index, { postSeparator: ', ' });

    expect(actual).toBe(expected);
  });
});
