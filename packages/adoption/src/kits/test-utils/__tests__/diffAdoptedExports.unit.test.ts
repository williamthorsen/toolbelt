import { describe, expect, it } from 'vitest';

import { diffAdoptedExports } from '../diffAdoptedExports.ts';

const candidate = { alpha() {}, beta() {} };
const release = { gamma() {}, VERSION: '1.0.0' };

describe(diffAdoptedExports, () => {
  it('reports nothing omitted or unexported when the list matches the callable exports', () => {
    expect(diffAdoptedExports([candidate, release], ['alpha', 'beta', 'gamma'])).toStrictEqual({
      callable: ['alpha', 'beta', 'gamma'],
      omitted: [],
      unexported: [],
    });
  });

  it('reports a callable export that the list omits', () => {
    expect(diffAdoptedExports([candidate, release], ['alpha', 'gamma']).omitted).toStrictEqual(['beta']);
  });

  it('reports a listed name that no tier exports', () => {
    expect(diffAdoptedExports([candidate, release], ['alpha', 'beta', 'gamma', 'delta']).unexported).toStrictEqual([
      'delta',
    ]);
  });

  it('neither counts a non-callable export as callable nor reports it as unexported when listed', () => {
    const diff = diffAdoptedExports([candidate, release], ['alpha', 'beta', 'gamma', 'VERSION']);

    expect(diff.callable).not.toContain('VERSION');
    expect(diff.unexported).toStrictEqual([]);
  });
});
