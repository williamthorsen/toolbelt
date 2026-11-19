import { listSourceSites } from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

import { listOwnPropertyCallSites } from '../listOwnPropertyCallSites.ts';

describe(listOwnPropertyCallSites, () => {
  it('claims the canonical form', () => {
    expect(listLines('const has = Object.prototype.hasOwnProperty.call(target, key);\n')).toStrictEqual([1]);
  });

  it('claims a call broken across lines by a formatter, at the line on which it opens', () => {
    const source = 'const has =\n  Object.prototype.hasOwnProperty\n    .call(target, key);\n';

    expect(listLines(source)).toStrictEqual([2]);
  });

  it('claims each of several calls in one source', () => {
    const source = dedent`
      const a = Object.prototype.hasOwnProperty.call(x, k);
      const b = Object.prototype.hasOwnProperty.call(y, k);

    `;

    expect(listLines(source)).toStrictEqual([1, 2]);
  });

  // eslint's recommended `no-prototype-builtins` already reports this form, and it is a defect rather than a
  // verbose spelling of one.
  it('declines the unguarded call on the value itself', () => {
    expect(listLines('const has = target.hasOwnProperty(key);\n')).toStrictEqual([]);
  });

  it('declines a same-named member reached through another object', () => {
    const source = 'const has = Realm.Object.prototype.hasOwnProperty.call(target, key);\n';

    expect(listLines(source)).toStrictEqual([]);
  });

  it('declines a bound reference that calls nothing', () => {
    expect(listLines('const has = Object.prototype.hasOwnProperty.bind(target);\n')).toStrictEqual([]);
  });
});

// region | Helpers

/** Lists the lines of the sites that the detector finds in a source, blanked as the kit blanks it. */
function listLines(source: string): number[] {
  return listSourceSites([listOwnPropertyCallSites], source).map(({ line }) => line);
}

// endregion | Helpers
