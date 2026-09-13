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
    label: 'a capture followed by a finally clause, which the substitution would skip',
    source: [
      'let caught: unknown;',
      'try {',
      '  parse(text);',
      '} catch (error) {',
      '  caught = error;',
      '} finally {',
      '  restore();',
      '}',
    ],
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
// Each a `toBe` argument from which the scan cannot tell that the thrown value is no `Error`, with the
// declarations ahead of the capture.
const STILL_CLAIMED = [
  { label: 'an Error bound to a const', declarations: ["const thrown = new Error('ENOENT');"], expected: 'thrown' },
  { label: 'a value bound to a call', declarations: ['const thrown = makeThrown();'], expected: 'thrown' },
  { label: 'a literal bound to a let', declarations: ["let thrown = { code: 'ENOENT' };"], expected: 'thrown' },
  { label: 'a binding declared nowhere the scan can see', declarations: [], expected: 'thrown' },
  { label: 'a literal opening a longer expression', declarations: [], expected: 'null ?? fallback' },
];
const LITERALS = [
  "{ code: 'ENOENT' }",
  "['ENOENT']",
  "'ENOENT'",
  '"ENOENT"',
  '`ENOENT`',
  '-2',
  'false',
  'null',
  'undefined',
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

  it('reads a generic call and an optionally-called one as the single calls they are', () => {
    const generic = [
      'let caught: unknown;',
      'try {',
      '  parse<Config>(text);',
      '} catch (error) {',
      '  caught = error;',
      '}',
    ];
    const optional = [
      'let caught: unknown;',
      'try {',
      '  parse?.(text);',
      '} catch (error) {',
      '  caught = error;',
      '}',
    ];

    expect(listCaptureSites(generic.join('\n'))).toStrictEqual([
      { kind: 'hand-rolled-error-capture', line: 2, symbol: 'caught' },
    ]);
    expect(listCaptureSites(optional.join('\n'))).toStrictEqual([
      { kind: 'hand-rolled-error-capture', line: 2, symbol: 'caught' },
    ]);
  });

  it('reports every capture a file holds', () => {
    const capture = ['let caught: unknown;', 'try {', '  parse(text);', '} catch (error) {', '  caught = error;', '}'];

    expect(listCaptureSites([...capture, ...capture].join('\n'))).toHaveLength(2);
  });

  it.each(UNCLAIMED)('claims nothing in $label', ({ source }) => {
    expect(listCaptureSites(source.join('\n'))).toStrictEqual([]);
  });

  it('declines a capture whose test asserts the captured value toBe a literal bound to a const', () => {
    const source = buildAssertedCapture(["const thrown = { code: 'ENOENT' };"], 'expect(caught).toBe(thrown);');

    expect(listCaptureSites(source)).toStrictEqual([]);
  });

  it.each(LITERALS)('declines a capture whose test asserts the captured value toBe the literal %s', (literal) => {
    expect(listCaptureSites(buildAssertedCapture([], `expect(caught).toBe(${literal});`))).toStrictEqual([]);
  });

  it('reads a literal through a type annotation, a cast, and an argument the formatter broke across lines', () => {
    const annotated = buildAssertedCapture(
      ["const thrown: unknown = { code: 'ENOENT' };"],
      'expect(caught).toBe(thrown);',
    );
    const cast = buildAssertedCapture(["const thrown = { code: 'ENOENT' } as const;"], 'expect(caught).toBe(thrown);');
    const broken = buildAssertedCapture([], ['expect(caught).toBe(', "  'ENOENT' as unknown,", ');'].join('\n'));

    expect(listCaptureSites(annotated)).toStrictEqual([]);
    expect(listCaptureSites(cast)).toStrictEqual([]);
    expect(listCaptureSites(broken)).toStrictEqual([]);
  });

  it.each(STILL_CLAIMED)('claims a capture asserted toBe $label', ({ declarations, expected }) => {
    const source = buildAssertedCapture(declarations, `expect(caught).toBe(${expected});`);

    expect(listCaptureSites(source)).toHaveLength(1);
  });

  it('claims a capture whose literal assertion is negated, compares by equality, or names another variable', () => {
    const negated = buildAssertedCapture([], "expect(caught).not.toBe('ENOENT');");
    const equal = buildAssertedCapture([], "expect(caught).toStrictEqual({ code: 'ENOENT' });");
    const other = buildAssertedCapture([], "expect(caughtCode).toBe('ENOENT');");

    expect(listCaptureSites(negated)).toHaveLength(1);
    expect(listCaptureSites(equal)).toHaveLength(1);
    expect(listCaptureSites(other)).toHaveLength(1);
  });

  it('claims a capture whose literal assertion sits in the following test', () => {
    const source = [
      buildAssertedCapture([], 'expect(caught).toBeInstanceOf(TypeError);'),
      buildAssertedCapture([], "expect(caught).toBe('ENOENT');"),
    ].join('\n');

    expect(listCaptureSites(source)).toStrictEqual([{ kind: 'hand-rolled-error-capture', line: 3, symbol: 'caught' }]);
  });
});

// region | Helpers

/** Builds a test holding a capture, with the declarations ahead of it and the assertion after it. */
function buildAssertedCapture(declarations: string[], assertion: string): string {
  return [
    "it('rethrows what it cannot describe', () => {",
    ...declarations,
    'let caught: unknown;',
    'try {',
    '  assertIsError(thrown);',
    '} catch (error) {',
    '  caught = error;',
    '}',
    assertion,
    '});',
  ].join('\n');
}

// endregion | Helpers
