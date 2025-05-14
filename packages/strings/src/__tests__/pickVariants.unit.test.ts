import { describe, expect, it } from 'vitest';

import { pickVariants } from '../pickVariants.ts';

describe(pickVariants, () => {
  it('given a string without variants, returns the string', () => {
    const input = 'Hello, world!';

    const output = pickVariants(input);

    expect(output).toBe(input);
  });

  it('given a string with variants, returns a string with the variants replaced by a randomly picked one', () => {
    const input = 'Hello, [name|world]!';
    const expected = /Hello, (name|world)!/;

    const output = pickVariants(input);

    expect(output).toMatch(expected);
  });

  it('if an empty variant is picked, replaces the variants with an empty string', () => {
    const input = 'Hello, Mr.[|] Doe';
    const expected = 'Hello, Mr. Doe';

    const output = pickVariants(input);

    expect(output).toBe(expected);
  });

  it('if delimiters are mismatched, throws an error', () => {
    const input = 'Hello, [name|world!';

    const throwingFn = () => pickVariants(input);
    expect(throwingFn).toThrow(new Error('Text has unmatched opening delimiter "[".'));
  });

  it('if delimiters are incorrectly nested, throws an error', () => {
    const input = 'Hello, ][!';

    const throwingFn = () => pickVariants(input);
    expect(throwingFn).toThrow(new Error('Text has unmatched closing delimiter "]".'));
  });

  it('if variants are nested, recursively picks variants', () => {
    const seed = 1234;
    const input = 'Hello, [Lord [Mars|Ares]|Lady [Venus|Aphrodite]] to Planet [Terra|Gaia]!';
    const expected = /^Hello, (Lord (Mars|Ares)|Lady (Venus|Aphrodite)) to Planet (Terra|Gaia)!$/;

    const actual = pickVariants(input, { seed });

    expect(actual).toMatch(expected);
  });

  it('given the same seed, always returns the same output', () => {
    const seed = 1234;
    const input = '[1[a[1|2]|b[3|4]]|2[d[5|6]|e[7|8]]]';

    const result1 = pickVariants(input, { seed });
    const result2 = pickVariants(input, { seed });

    expect(result1).toBe(result2);
  });
});
