import { describe, expect, it } from 'vitest';

import { listDisposalHooks } from '../listDisposalHooks.ts';

describe(listDisposalHooks, () => {
  it('reports nothing for a file holding no hook', () => {
    expect(listDisposalHooks("it('works', () => {});")).toStrictEqual([]);
  });

  it('names the line of a disposal written as a concise arrow', () => {
    const source = [
      "it('builds a tree', () => {",
      '  const tree = createTempTree({});',
      '  onTestFinished(() => tree[Symbol.dispose]());',
      '});',
    ].join('\n');

    expect(listDisposalHooks(source)).toStrictEqual([{ kind: 'disposal-hook', line: 3 }]);
  });

  it('reads a disposal written in a block body', () => {
    const source = 'onTestFinished(() => {\n  tree[Symbol.dispose]();\n});';

    expect(listDisposalHooks(source)).toStrictEqual([{ kind: 'disposal-hook', line: 1 }]);
  });

  it('reads the hook taken off the test context', () => {
    const source =
      "it('builds a tree', ({ onTestFinished }) => {\n  onTestFinished(() => tree[Symbol.dispose]());\n});";

    expect(listDisposalHooks(source)).toStrictEqual([{ kind: 'disposal-hook', line: 2 }]);
  });

  it('reads the hook reached through the context object', () => {
    const source = 'ctx.onTestFinished(() => tree[Symbol.dispose]());';

    expect(listDisposalHooks(source)).toStrictEqual([{ kind: 'disposal-hook', line: 1 }]);
  });

  it('matches the hook and the disposal however they are spaced', () => {
    const source = 'onTestFinished ( ( ) => tree [ Symbol . dispose ] ( ) );';

    expect(listDisposalHooks(source)).toStrictEqual([{ kind: 'disposal-hook', line: 1 }]);
  });

  it('reports a callback that disposes alongside other cleanup', () => {
    const source = 'onTestFinished(() => {\n  server.close();\n  tree[Symbol.dispose]();\n});';

    expect(listDisposalHooks(source)).toStrictEqual([{ kind: 'disposal-hook', line: 1 }]);
  });

  it('reports every hook in a file', () => {
    const source = [
      'onTestFinished(() => tree[Symbol.dispose]());',
      'onTestFinished(() => cwd.restore());',
      'onTestFinished(() => {\n  stdio[Symbol.dispose]();\n});',
    ].join('\n');

    expect(listDisposalHooks(source).map((hook) => hook.line)).toStrictEqual([1, 3]);
  });

  it('reads a callback running past any fixed window', () => {
    const padding = '  // padding padding padding padding padding padding\n'.repeat(9);
    const source = `onTestFinished(() => {\n${padding}  tree[Symbol.dispose]();\n});`;

    expect(listDisposalHooks(source)).toStrictEqual([{ kind: 'disposal-hook', line: 1 }]);
  });

  it('declines a callback that cleans up by other means', () => {
    const sources = [
      'onTestFinished(() => chdirSpy.mockRestore());',
      'onTestFinished(() => fs.rmSync(dir, { recursive: true }));',
      'onTestFinished(async () => {\n  await server.close();\n});',
    ];

    expect(sources.map(listDisposalHooks)).toStrictEqual(sources.map(() => []));
  });

  it('declines a callback given as a bare reference', () => {
    expect(listDisposalHooks('onTestFinished(cleanup);')).toStrictEqual([]);
  });

  it('declines an unbound disposal handed straight to the hook', () => {
    expect(listDisposalHooks('onTestFinished(tree[Symbol.dispose]);')).toStrictEqual([]);
  });

  it('declines an asynchronous disposal, which the package has no overload for', () => {
    const source = 'onTestFinished(async () => {\n  await pool[Symbol.asyncDispose]();\n});';

    expect(listDisposalHooks(source)).toStrictEqual([]);
  });

  it('declines a disposal outside any hook', () => {
    const sources = [
      'const dispose = () => tree[Symbol.dispose]();',
      'using tree = createTempTree({});',
      'afterEach(() => tree[Symbol.dispose]());',
    ];

    expect(sources.map(listDisposalHooks)).toStrictEqual(sources.map(() => []));
  });

  it('declines the helper the check recommends', () => {
    const source = 'const tree = disposeOnTestFinished(createTempTree({}));';

    expect(listDisposalHooks(source)).toStrictEqual([]);
  });

  it('finds no hook in prose about one', () => {
    const sources = [
      '// Replaces onTestFinished(() => tree[Symbol.dispose]()) with disposeOnTestFinished.\n',
      '/**\n * Replaces onTestFinished(() => tree[Symbol.dispose]()).\n */\n',
      'const fix = "replace onTestFinished(() => tree[Symbol.dispose]())";\n',
      'const fix = `replace onTestFinished(() => tree[Symbol.dispose]())`;\n',
      'const pattern = /onTestFinished(() => tree[Symbol.dispose]())/;\n',
    ];

    expect(sources.map(listDisposalHooks)).toStrictEqual(sources.map(() => []));
  });

  it('declines an argument list that never balances', () => {
    expect(listDisposalHooks('onTestFinished(() => tree[Symbol.dispose]();')).toStrictEqual([]);
  });
});
