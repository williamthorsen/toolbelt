import { describe, expect, it } from 'vitest';

import { listExitMocks } from '../listExitMocks.ts';

describe(listExitMocks, () => {
  it('reports nothing for a file holding no mock', () => {
    expect(listExitMocks("it('works', () => {});")).toStrictEqual([]);
  });

  it('names the line and the sentinel class declared by a clone', () => {
    const source = `class ExitError extends Error {}

beforeEach(() => {
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new ExitError(code);
  });
});`;

    expect(listExitMocks(source)).toStrictEqual([{ kind: 'sentinel-clone', line: 4, symbol: 'ExitError' }]);
  });

  it('matches the spy however it is spaced or quoted', () => {
    const source = `vi.spyOn( process , "exit" ).mockImplementation(() => {});`;

    expect(listExitMocks(source)).toStrictEqual([{ kind: 'non-throwing', line: 1 }]);
  });

  it('reports every mock in a file', () => {
    const source = `vi.spyOn(process, 'exit').mockImplementation(() => {});
vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('exit');
});`;

    expect(listExitMocks(source).map((mock) => mock.kind)).toStrictEqual(['non-throwing', 'throwing']);
  });

  it('finds no mock in prose about one', () => {
    const sources = [
      "// Replaces vi.spyOn(process, 'exit') with throwOnProcessExit.\n",
      "/**\n * Replaces vi.spyOn(process, 'exit') with throwOnProcessExit.\n */\n",
      'const fix = "replace vi.spyOn(process, \'exit\')";\n',
      "const fix = `replace vi.spyOn(process, 'exit') with throwOnProcessExit`;\n",
      "const pattern = /vi.spyOn(process, 'exit')/;\n",
    ];

    expect(sources.map(listExitMocks)).toStrictEqual(sources.map(() => []));
  });

  it('declines a sentinel class that the file names only in a comment', () => {
    const source = [
      '// class ExitError extends Error {}',
      "vi.spyOn(process, 'exit').mockImplementation(() => {",
      '  throw new ExitError();',
      '});',
    ].join('\n');

    expect(listExitMocks(source)).toStrictEqual([{ kind: 'throwing', line: 2 }]);
  });

  it('reads a body running past any fixed window', () => {
    const padding = '  // padding padding padding padding padding padding\n'.repeat(9);
    const source = `vi.spyOn(process, 'exit').mockImplementation((code) => {\n${padding}  throw new Error('late');\n});`;

    expect(listExitMocks(source).map((mock) => mock.kind)).toStrictEqual(['throwing']);
  });
});
