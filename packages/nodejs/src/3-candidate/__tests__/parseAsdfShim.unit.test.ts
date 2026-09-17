import { describe, expect, it } from 'vitest';

import { parseAsdfShim } from '../parseAsdfShim.ts';

const SHIM = [
  '#!/usr/bin/env bash',
  '# asdf-plugin: nodejs 24.20.0',
  '# asdf-plugin: nodejs 24.19.0',
  'exec asdf exec "pnpm" "$@"',
].join('\n');

describe(parseAsdfShim, () => {
  it('lists every provider in header order', () => {
    expect(parseAsdfShim(SHIM)).toStrictEqual([
      { plugin: 'nodejs', version: '24.20.0' },
      { plugin: 'nodejs', version: '24.19.0' },
    ]);
  });

  it('keeps providers of different plugins apart', () => {
    const shim = '# asdf-plugin: nodejs 24.20.0\n# asdf-plugin: python 3.13.1\n';

    expect(parseAsdfShim(shim)).toStrictEqual([
      { plugin: 'nodejs', version: '24.20.0' },
      { plugin: 'python', version: '3.13.1' },
    ]);
  });

  it('skips a header line with fewer than four segments, as asdf does', () => {
    expect(parseAsdfShim('# asdf-plugin: nodejs\n# asdf-plugin: nodejs 24.20.0\n')).toStrictEqual([
      { plugin: 'nodejs', version: '24.20.0' },
    ]);
  });

  it.each(['', '#!/usr/bin/env bash\nexec asdf exec "node" "$@"', 'asdf-plugin: nodejs 24.20.0'])(
    'yields nothing for a file without a header: %o',
    (contents) => {
      expect(parseAsdfShim(contents)).toStrictEqual([]);
    },
  );
});
