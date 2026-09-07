import { describe, expect, it } from 'vitest';

import { listCaptureSites } from '../listCaptureSites.ts';

// Each source a legitimate use of try/catch that the substitution does not reach. The first four are the
// shapes this repository actually holds; the rest are the ways a capture can look without being one.
const UNCLAIMED = [
  {
    label: 'a try/finally, which captures nothing',
    source: ['try {', "  const error = chainError('Failed', new Error('ENOENT'));", '} finally {', '  restore();', '}'],
  },
  {
    label: 'a catch that reports rather than assigns',
    source: ['try {', '  await promise;', '  onComplete();', '} catch (error) {', '  onError(error);', '}'],
  },
  {
    label: 'a try block that keeps the result',
    source: [
      'let report: unknown;',
      'try {',
      '  report = JSON.parse(stdout);',
      '} catch {',
      '  return undefined;',
      '}',
    ],
  },
  {
    label: 'a catch that branches before it returns',
    source: [
      'let returned: unknown;',
      'try {',
      '  returned = await run();',
      '} catch (error: unknown) {',
      '  if (error instanceof expected) return error;',
      '  throw new Error(message, { cause: error });',
      '}',
    ],
  },
  {
    label: 'a catch that rethrows',
    source: ['let caught: unknown;', 'try {', '  parse(text);', '} catch (error) {', '  throw error;', '}'],
  },
  {
    label: 'a value bound inside the catch, which never escapes it',
    source: ['try {', '  parse(text);', '} catch (error) {', '  const caught = error;', '  report(caught);', '}'],
  },
  {
    label: 'a target a catch block cannot reassign',
    source: ['const caught = undefined;', 'try {', '  parse(text);', '} catch (error) {', '  caught = error;', '}'],
  },
  {
    label: 'a try block running two calls',
    source: [
      'let caught: unknown;',
      'try {',
      '  setup();',
      '  parse(text);',
      '} catch (error) {',
      '  caught = error;',
      '}',
    ],
  },
  {
    label: 'a target declared nowhere the scan can see',
    source: ['try {', '  parse(text);', '} catch (error) {', '  outcome.caught = error;', '}'],
  },
  {
    label: 'the idiom written in a comment',
    source: ['// let caught; try { parse(text); } catch (error) { caught = error; }', 'const noop = 1;'],
  },
  {
    label: 'the idiom written in a literal',
    source: ['const sample = `let caught; try { parse(text); } catch (error) { caught = error; }`;'],
  },
];

describe(listCaptureSites, () => {
  it('reports a capture, naming its line and the variable it fills', () => {
    const source = [
      "const thrown = { code: 'ENOENT' };",
      'let caught: unknown;',
      '',
      'try {',
      '  assertIsError(thrown);',
      '} catch (error) {',
      '  caught = error;',
      '}',
    ].join('\n');

    expect(listCaptureSites(source)).toStrictEqual([{ kind: 'hand-rolled-error-capture', line: 4, symbol: 'caught' }]);
  });

  it('reaches a declaration made outside an enclosing hook', () => {
    const source = [
      'let thrown: unknown;',
      '',
      '// The call has to happen in the hook.',
      'beforeAll(() => {',
      '  try {',
      "    disposeOnTestFinished(makeProbe('no-test'));",
      '  } catch (error: unknown) {',
      '    thrown = error;',
      '  }',
      '});',
    ].join('\n');

    expect(listCaptureSites(source)).toStrictEqual([{ kind: 'hand-rolled-error-capture', line: 5, symbol: 'thrown' }]);
  });

  it('reads a call the formatter broke across lines, and a catch that casts', () => {
    const source = [
      'let error: Error | undefined;',
      '',
      'try {',
      '  await loadRemoteKit({',
      '    url,',
      '  });',
      '} catch (thrown) {',
      '  error = thrown as Error;',
      '}',
    ].join('\n');

    expect(listCaptureSites(source)).toStrictEqual([{ kind: 'hand-rolled-error-capture', line: 3, symbol: 'error' }]);
  });

  it('reads a construction as the single call that it is', () => {
    const source = [
      'let caught: unknown;',
      'try {',
      '  new Parser(text);',
      '} catch (error) {',
      '  caught = error;',
      '}',
    ].join('\n');

    expect(listCaptureSites(source)).toStrictEqual([{ kind: 'hand-rolled-error-capture', line: 2, symbol: 'caught' }]);
  });

  it('reports every capture a file holds', () => {
    const capture = ['let caught: unknown;', 'try {', '  parse(text);', '} catch (error) {', '  caught = error;', '}'];

    expect(listCaptureSites([...capture, ...capture].join('\n'))).toHaveLength(2);
  });

  it.each(UNCLAIMED)('claims nothing in $label', ({ source }) => {
    expect(listCaptureSites(source.join('\n'))).toStrictEqual([]);
  });
});
