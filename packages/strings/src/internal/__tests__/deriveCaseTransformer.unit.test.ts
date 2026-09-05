import { describe, expect, it } from 'vitest';

import { deriveCaseTransformer } from '../deriveCaseTransformer.ts';

describe(deriveCaseTransformer, () => {
  it('if the source and target are identical, returns an identity function', () => {
    const source = 'abCde';

    const transform = deriveCaseTransformer(source, source);

    assertIsTruthy(transform);
    expect(transform('ABcDE')).toBe('ABcDE');
  });

  it('if the source and the target are not identical when case is ignored, returns undefined', () => {
    const source = 'abc';
    const target = 'def';

    const transform = deriveCaseTransformer(source, target);

    expect(transform).toBeUndefined();
  });

  it.each(['TEXT', 'Text', 'TeXt'])(
    `if the source is not lowercase (case: "%s") and does not match the target, returns null`,
    (source) => {
      const target = 'texT';

      const transform = deriveCaseTransformer(source, target);

      expect(transform).toBeUndefined();
    },
  );

  it('if uppercase(source) is identical to the target, returns a toUpperCase function', () => {
    const source = 'text';
    const target = 'TEXT';

    const transform = deriveCaseTransformer(source, target);

    assertIsTruthy(transform);
    expect(transform('abc')).toBe('ABC');
  });

  it('if capitalize(source) is identical to the target, returns a toCapitalized function', () => {
    const source = 'text';
    const target = 'Text';

    const transform = deriveCaseTransformer(source, target);

    assertIsTruthy(transform);
    expect(transform('abc')).toBe('Abc');
  });

  it('if neither uppercase nor capitalize makes the source identical to the target, returns null', () => {
    const source = 'text';
    const target = 'tExt';

    const transform = deriveCaseTransformer(source, target);

    expect(transform).toBeUndefined();
  });
});

/** Type guard to assure TypeScript that null won't be invoked. */
function assertIsTruthy(value: unknown): asserts value {
  if (!value) {
    throw new Error(`Expected ${JSON.stringify(value)} to be truthy`);
  }
}
