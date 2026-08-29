import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { isScaffolding } from '../scaffolding-dirs.ts';

describe(isScaffolding, () => {
  it('reports a path passing through a test directory', () => {
    expect(isScaffolding(path.join('src', '4-release', '__tests__', 'identity.unit.test.ts'))).toBe(true);
  });

  it('reports a path passing through a helper directory', () => {
    expect(isScaffolding(path.join('src', 'test-utils', 'makeFixture.ts'))).toBe(true);
  });

  it('reports no scaffolding for a path of source directories alone', () => {
    expect(isScaffolding(path.join('src', '4-release', 'identity.ts'))).toBe(false);
  });

  it('matches a whole segment rather than a substring of one', () => {
    expect(isScaffolding(path.join('src', 'test-utilities', 'build.ts'))).toBe(false);
  });

  it('reports no scaffolding for a file named after a scaffolding directory', () => {
    expect(isScaffolding(path.join('src', 'test-utils.ts'))).toBe(false);
  });
});
