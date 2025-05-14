import { describe, expect, it } from 'vitest';

import { concatenate } from '../concatenate.ts';

describe(concatenate, () => {
  it('if array is empty, returns it', () => {
    const input: string[] = [];
    const expected = '';

    const actual = concatenate(input);

    expect(actual).toBe(expected);
  });

  it('if array has one element, returns the element', () => {
    const input = ['first'];
    const expected = 'first';

    const actual = concatenate(input);

    expect(actual).toBe(expected);
  });

  it('if array has two elements, returns them linked by the dualSeparator', () => {
    const input = ['first', 'second'];
    const expected = 'first and second';

    const actual = concatenate(input);

    expect(actual).toBe(expected);
  });

  it('if array has three elements, returns them linked by the dualSeparator', () => {
    const input = ['first', 'second', 'third'];
    const expected = 'first, second, and third';

    const actual = concatenate(input);

    expect(actual).toBe(expected);
  });

  it('accepts custom separators', () => {
    const options = { dualSeparator: ' + ', finalSeparator: ' & ', separator: ' | ' };
    const useCases: [string[], string][] = [
      [[], ''],
      [['1'], '1'],
      [['1', '2'], '1 + 2'],
      [['1', '2', '3'], '1 | 2 & 3'],
    ];
    for (const [input, expected] of useCases) {
      const actual = concatenate(input, options);
      expect(actual).toBe(expected);
    }
  });
});
