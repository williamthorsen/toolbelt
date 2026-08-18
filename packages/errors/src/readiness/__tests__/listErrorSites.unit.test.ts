import { describe, expect, it } from 'vitest';

import { type ErrorSiteKind, listErrorSites } from '../listErrorSites.ts';

/** Names the kind of every site in a source, which is what each case asserts on. */
function listKinds(source: string): ErrorSiteKind[] {
  return listErrorSites(source).map((site) => site.kind);
}

describe(listErrorSites, () => {
  it('names an inline description with a String fallback', () => {
    const source = 'const message = error instanceof Error ? error.message : String(error);';

    expect(listKinds(source)).toStrictEqual(['describe-inline']);
  });

  it('names an inline description wrapped across lines', () => {
    const source = ['const message =', '  error instanceof Error', '    ? error.message', '    : String(error);'].join(
      '\n',
    );

    expect(listKinds(source)).toStrictEqual(['describe-inline']);
  });

  it('names an inline description falling back to a domain literal', () => {
    const source = "const message = error instanceof Error ? error.message : 'Unknown error';";

    expect(listKinds(source)).toStrictEqual(['describe-inline']);
  });

  it('names an inline description in statement form', () => {
    const source = 'if (error instanceof Error) {\n  return error.message;\n}\nreturn fallback;';

    expect(listKinds(source)).toStrictEqual(['describe-inline']);
  });

  it('names a hand-rolled coercion to Error', () => {
    const source = 'const wrapped = value instanceof Error ? value : new Error(String(value));';

    expect(listKinds(source)).toStrictEqual(['coerce']);
  });

  it('names a negated narrowing that throws', () => {
    const source = [
      'if (!(value instanceof Error)) {',
      '  console.error(value);',
      "  throw new TypeError('Expected an Error');",
      '}',
    ].join('\n');

    expect(listKinds(source)).toStrictEqual(['assert']);
  });

  it('names a refinement toward a non-message property as a narrowing', () => {
    const source = "return error instanceof Error && 'code' in error && typeof error.code === 'string';";

    expect(listKinds(source)).toStrictEqual(['narrow']);
  });

  it('names a guard branching on message content as a narrowing', () => {
    const source = "if (error instanceof Error && error.message.includes('current origin')) {\n  return;\n}";

    expect(listKinds(source)).toStrictEqual(['narrow']);
  });

  it('names a locally defined describeError as a clone, once, with its function name', () => {
    const source = [
      'export function describeError(error: unknown): string {',
      '  if (error instanceof Error) return error.message;',
      '  return String(error);',
      '}',
    ].join('\n');

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'describe-clone', line: 2, symbol: 'describeError' }]);
  });

  it('names a three-arm description helper as a clone', () => {
    const source = [
      'function toPanelMessage(error: unknown): string {',
      '  if (error instanceof Error) {',
      '    return error.message;',
      '  }',
      "  if (typeof error === 'string') {",
      '    return error;',
      '  }',
      "  return 'An unexpected error occurred during panel creation.';",
      '}',
    ].join('\n');

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'describe-clone', line: 2, symbol: 'toPanelMessage' }]);
  });

  it('leaves a function that composes rather than describes to the per-site classification', () => {
    const source = [
      'function toDetail(error: unknown, parts: string[]): string {',
      '  if (error instanceof Error) {',
      '    parts.push(error.message);',
      '  }',
      '  return parts.join(separator);',
      '}',
    ].join('\n');

    expect(listKinds(source)).toStrictEqual(['narrow']);
  });

  it('reports the line of each site', () => {
    const source = ['const a = 1;', '', 'const message = error instanceof Error ? error.message : String(error);'].join(
      '\n',
    );

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'describe-inline', line: 3 }]);
  });

  it('reports every site in a file', () => {
    const source = [
      'const message = error instanceof Error ? error.message : String(error);',
      'const wrapped = value instanceof Error ? value : new Error(String(value));',
      "const isErrno = error instanceof Error && 'code' in error;",
    ].join('\n');

    expect(listKinds(source)).toStrictEqual(['describe-inline', 'coerce', 'narrow']);
  });

  it('finds no site in a source that never tests for an Error', () => {
    expect(listErrorSites('export const answer = 42;')).toStrictEqual([]);
  });

  it('finds no site in prose about the operator', () => {
    const sources = [
      '// Returns the message where the value is an instanceof Error.\n',
      '/**\n * Reports whether a thrown value is an instanceof Error.\n */\n',
      "const label = 'instanceof Error';\n",
      'const fix = `use isError instead of instanceof Error`;\n',
      String.raw`const pattern = /\binstanceof Error\b/g;` + '\n',
    ];

    expect(sources.map(listErrorSites)).toStrictEqual(sources.map(() => []));
  });

  it('reports a site the prose beside it never obscures', () => {
    const source = [
      '// Falls back to instanceof Error where the guard is unavailable.',
      'const message = error instanceof Error ? error.message : String(error);',
    ].join('\n');

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'describe-inline', line: 2 }]);
  });
});
