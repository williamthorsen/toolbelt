import { describe, expect, it } from 'vitest';

import { listGuardClones } from '../listGuardClones.ts';

// Every fixture is a joined literal, which blanking erases before the detector reads this file. A fixture
// written as live code would put the package's own suite on its own report.
const ASSERT_CLONE = [
  'function assert(condition, message) {',
  '  if (!condition) {',
  '    throw new Error(message);',
  '  }',
  '}',
  '',
].join('\n');
const ASSERT_CLONE_RETURNING = [
  'function invariant(condition, message) {',
  '  if (condition) return;',
  '  throw new Error(message);',
  '}',
  '',
].join('\n');
const NULLISH_ASSERT_CLONE = [
  'function assertDefined(value) {',
  '  if (value === null || value === undefined) throw new Error(MISSING);',
  '}',
  '',
].join('\n');
const NULLISH_ASSERT_CLONE_RETURNING = [
  'function assertPresent(value) {',
  '  if (value !== null && value !== undefined) return;',
  '  throw new Error(MISSING);',
  '}',
  '',
].join('\n');
const STRING_CLONE = ['function isText(value) {', "  return typeof value === 'string';", '}', ''].join('\n');
const BOOLEAN_CLONE = ['function isFlag(value) {', "  return typeof value === 'boolean';", '}', ''].join('\n');
const NUMBER_CLONE = ['function isNum(value) {', "  return typeof value === 'number';", '}', ''].join('\n');
const NUMBER_CLONE_EXCLUDING_NAN = [
  'function isRealNumber(value) {',
  "  return typeof value === 'number' && !Number.isNaN(value);",
  '}',
  '',
].join('\n');
const NON_NULLABLE_CLONE = [
  'function isDefined(value) {',
  '  return value !== null && value !== undefined;',
  '}',
  '',
].join('\n');
const NON_NULLABLE_CLONE_LOOSE = ['const isPresent = (value) => {', '  return value != null;', '};', ''].join('\n');
const NULLISH_CLONE = ['function isMissing(value) {', '  return value === undefined || value === null;', '}', ''].join(
  '\n',
);

describe(listGuardClones, () => {
  it('reports a function that throws on a falsy argument', () => {
    expect(summarize(ASSERT_CLONE)).toStrictEqual([{ kind: 'assert-clone', line: 1, symbol: 'assert' }]);
  });

  it('reports a function that returns on a truthy argument and otherwise throws', () => {
    expect(summarize(ASSERT_CLONE_RETURNING)).toStrictEqual([{ kind: 'assert-clone', line: 1, symbol: 'invariant' }]);
  });

  it('reports a function that throws on a nullish argument', () => {
    expect(summarize(NULLISH_ASSERT_CLONE)).toStrictEqual([
      { kind: 'nullish-assert-clone', line: 1, symbol: 'assertDefined' },
    ]);
  });

  it('reports a function that returns on a present argument and otherwise throws', () => {
    expect(summarize(NULLISH_ASSERT_CLONE_RETURNING)).toStrictEqual([
      { kind: 'nullish-assert-clone', line: 1, symbol: 'assertPresent' },
    ]);
  });

  it('reports each primitive guard by the tag that it compares', () => {
    expect([STRING_CLONE, NUMBER_CLONE, BOOLEAN_CLONE].flatMap(summarize)).toStrictEqual([
      { kind: 'string-clone', line: 1, symbol: 'isText' },
      { kind: 'number-clone', line: 1, symbol: 'isNum' },
      { kind: 'boolean-clone', line: 1, symbol: 'isFlag' },
    ]);
  });

  it('reports a number guard that already excludes NaN', () => {
    expect(summarize(NUMBER_CLONE_EXCLUDING_NAN)).toStrictEqual([
      { kind: 'number-clone', line: 1, symbol: 'isRealNumber' },
    ]);
  });

  it('reports both spellings of a presence guard, including one written as an arrow', () => {
    expect([NON_NULLABLE_CLONE, NON_NULLABLE_CLONE_LOOSE].flatMap(summarize)).toStrictEqual([
      { kind: 'non-nullable-clone', line: 1, symbol: 'isDefined' },
      { kind: 'non-nullable-clone', line: 1, symbol: 'isPresent' },
    ]);
  });

  it('reports a nullish guard whose operands are written in either order', () => {
    expect(summarize(NULLISH_CLONE)).toStrictEqual([{ kind: 'nullish-clone', line: 1, symbol: 'isMissing' }]);
  });

  // The package's own `assert`, verbatim but for its type annotations: the likeliest clone in the wild is a
  // copy of it, and its extra guard on the error argument must not take it out of the class.
  it('reports a copy of this package’s own assert', () => {
    const source = [
      'export function assert(condition, error) {',
      '  if (condition) {',
      '    return;',
      '  }',
      '',
      '  if (error instanceof Error) {',
      '    throw error;',
      '  }',
      "  throw new Error(error || 'Assertion failed');",
      '}',
      '',
    ].join('\n');

    expect(summarize(source)).toStrictEqual([{ kind: 'assert-clone', line: 1, symbol: 'assert' }]);
  });

  it('names the line that the function head holds', () => {
    expect(summarize(['const x = 1;', '', STRING_CLONE].join('\n'))).toStrictEqual([
      { kind: 'string-clone', line: 3, symbol: 'isText' },
    ]);
  });

  // The rules that hold the kit to functions an import retires. Each of these is working code that no export
  // of this package could replace.
  it('declines a guard that tests the result of a call', () => {
    const source = [
      'function assertIsUser(value) {',
      '  if (!isUser(value)) throw new TypeError(NOT_A_USER);',
      '}',
      '',
    ].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  it('declines a guard that narrows by instanceof, which toolbelt.errors claims', () => {
    const source = [
      'function assertIsError(value) {',
      '  if (!(value instanceof Error)) throw new TypeError(NOT_AN_ERROR);',
      '}',
      '',
    ].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  it('declines a guard that tests a property rather than the argument', () => {
    const source = ['function isNamed(user) {', "  return typeof user.name === 'string';", '}', ''].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  it('declines a function that does anything besides assert', () => {
    const source = [
      'function assert(condition) {',
      '  record(condition);',
      '  if (!condition) throw new Error(FAILED);',
      '}',
      '',
    ].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  it('declines a predicate whose body holds more than the comparison', () => {
    const source = [
      'function isText(value) {',
      '  const tag = typeof value;',
      "  return tag === 'string';",
      '}',
      '',
    ].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  it('declines a negated comparison, which is the guard’s complement', () => {
    const source = ['function isNotText(value) {', "  return typeof value !== 'string';", '}', ''].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  it('declines a null test that leaves undefined admitted', () => {
    const source = ['function isNotNull(value) {', '  return value !== null;', '}', ''].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  it('declines a tag that this package publishes no guard for', () => {
    const source = ['function isSymbol(value) {', "  return typeof value === 'symbol';", '}', ''].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  it('declines a function whose parameter list destructures', () => {
    const source = ['function isText({ value }) {', "  return typeof value === 'string';", '}', ''].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });

  // Blanking replaces a template literal's characters with spaces, so a body holding a large one becomes a long
  // whitespace run. The test fails by timing out where the body pattern backtracks over it.
  it('returns promptly on a body that blanking turns into a long whitespace run', () => {
    const source = ['function render(value) {', '  return `' + 'x'.repeat(40_000) + '`;', '}', ''].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  }, 2_000);

  it('declines a guard written in a comment or a string', () => {
    const source = [
      "// function isText(value) { return typeof value === 'string'; }",
      'const sample = "function isText(value) { return typeof value === \'string\'; }";',
      '',
    ].join('\n');

    expect(summarize(source)).toStrictEqual([]);
  });
});

// region | Helpers

/** Names each reported clone by its kind, its line, and the function that it names. */
function summarize(source: string): Array<{ kind: string; line: number; symbol: string | undefined }> {
  return listGuardClones(source).map((site) => ({ kind: site.kind, line: site.line, symbol: site.symbol }));
}

// endregion | Helpers
