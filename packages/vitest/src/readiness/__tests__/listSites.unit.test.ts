import { describe, expect, it } from 'vitest';

import { listSites } from '../listSites.ts';

describe(listSites, () => {
  it('reports nothing for a file holding none of the idioms', () => {
    expect(listSites("it('works', () => {});")).toStrictEqual([]);
  });

  it('reports a file holding only exit mocks', () => {
    const source = `vi.spyOn(process, 'exit').mockImplementation(() => {});`;

    expect(listSites(source)).toStrictEqual([{ kind: 'non-throwing', line: 1 }]);
  });

  it('reports a file holding only console sites', () => {
    const source = `vi.spyOn(console, 'warn').mockImplementation(() => {});`;

    expect(listSites(source)).toStrictEqual([{ kind: 'console-silence', line: 1 }]);
  });

  it('reports a file holding only disposal hooks', () => {
    const source = `onTestFinished(() => tree[Symbol.dispose]());`;

    expect(listSites(source)).toStrictEqual([{ kind: 'disposal-hook', line: 1 }]);
  });

  it('interleaves every idiom in line order', () => {
    const source = `vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('exit');
});
onTestFinished(() => tree[Symbol.dispose]());
vi.spyOn(console, 'error').mockImplementation((message) => { lines.push(message); });`;

    expect(listSites(source)).toStrictEqual([
      { kind: 'console-silence', line: 1 },
      { kind: 'throwing', line: 2 },
      { kind: 'disposal-hook', line: 5 },
      { kind: 'console-capture-lossy', line: 6 },
    ]);
  });

  it('carries the symbol an exit mock names', () => {
    const source = `class ExitError extends Error {}
vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new ExitError(code);
});`;

    expect(listSites(source)).toStrictEqual([{ kind: 'sentinel-clone', line: 2, symbol: 'ExitError' }]);
  });
});
