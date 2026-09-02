import { describe, expect, it } from 'vitest';

import { listOwnPropertyCallLines } from '../listOwnPropertyCallLines.ts';

describe(listOwnPropertyCallLines, () => {
  it('claims the canonical form', () => {
    expect(listOwnPropertyCallLines('const has = Object.prototype.hasOwnProperty.call(target, key);\n')).toStrictEqual([
      1,
    ]);
  });

  it('claims a call broken across lines by a formatter, at the line on which it opens', () => {
    const source = 'const has =\n  Object.prototype.hasOwnProperty\n    .call(target, key);\n';

    expect(listOwnPropertyCallLines(source)).toStrictEqual([2]);
  });

  it('claims each of several calls in one source', () => {
    const source = [
      'const a = Object.prototype.hasOwnProperty.call(x, k);',
      'const b = Object.prototype.hasOwnProperty.call(y, k);',
      '',
    ].join('\n');

    expect(listOwnPropertyCallLines(source)).toStrictEqual([1, 2]);
  });

  // eslint's recommended `no-prototype-builtins` already reports this form, and it is a defect rather than a
  // verbose spelling of one.
  it('declines the unguarded call on the value itself', () => {
    expect(listOwnPropertyCallLines('const has = target.hasOwnProperty(key);\n')).toStrictEqual([]);
  });

  it('declines a same-named member reached through another object', () => {
    const source = 'const has = Realm.Object.prototype.hasOwnProperty.call(target, key);\n';

    expect(listOwnPropertyCallLines(source)).toStrictEqual([]);
  });

  it('declines a bound reference that calls nothing', () => {
    expect(listOwnPropertyCallLines('const has = Object.prototype.hasOwnProperty.bind(target);\n')).toStrictEqual([]);
  });
});
