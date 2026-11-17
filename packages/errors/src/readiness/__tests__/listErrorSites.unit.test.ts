import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

import { type ErrorSiteKind, listErrorSites } from '../listErrorSites.ts';

/** Names the kind of every site in a source, on which each case asserts. */
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
    const source = dedent`
      if (!(value instanceof Error)) {
        console.error(value);
        throw new TypeError('Expected an Error');
      }
    `;

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
    const source = dedent`
      export function describeError(error: unknown): string {
        if (error instanceof Error) return error.message;
        return String(error);
      }
    `;

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'describe-clone', line: 2, symbol: 'describeError' }]);
  });

  it('names a three-arm description helper as a clone', () => {
    const source = dedent`
      function toPanelMessage(error: unknown): string {
        if (error instanceof Error) {
          return error.message;
        }
        if (typeof error === 'string') {
          return error;
        }
        return 'An unexpected error occurred during panel creation.';
      }
    `;

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'describe-clone', line: 2, symbol: 'toPanelMessage' }]);
  });

  it('leaves a function that composes rather than describes to the per-site classification', () => {
    const source = dedent`
      function toDetail(error: unknown, parts: string[]): string {
        if (error instanceof Error) {
          parts.push(error.message);
        }
        return parts.join(separator);
      }
    `;

    expect(listKinds(source)).toStrictEqual(['narrow']);
  });

  it('reports the line of each site', () => {
    const source = ['const a = 1;', '', 'const message = error instanceof Error ? error.message : String(error);'].join(
      '\n',
    );

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'describe-inline', line: 3 }]);
  });

  it('reports every site in a file', () => {
    const source = dedent`
      const message = error instanceof Error ? error.message : String(error);
      const wrapped = value instanceof Error ? value : new Error(String(value));
      const isErrno = error instanceof Error && 'code' in error;
    `;

    expect(listKinds(source)).toStrictEqual(['describe-inline', 'coerce', 'narrow']);
  });

  it('names a missing-path test alongside the instanceof sites, in source order', () => {
    const source = dedent`
      const isErrno = error instanceof Error && 'code' in error;
      if (error.code === 'ENOENT') return;
    `;

    expect(listErrorSites(source)).toStrictEqual([
      { kind: 'narrow', line: 1 },
      { kind: 'missing-path-partial', line: 2 },
    ]);
  });

  it('leaves an instanceof Error guarding a missing-path test to the missing-path site', () => {
    const source = "if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;";

    expect(listKinds(source)).toStrictEqual(['missing-path-partial']);
  });

  it('leaves a parenthesized guard to the missing-path site across a long chain', () => {
    const source = `if ((error instanceof Error) && ${"'code' in error && ".repeat(20)}error.code === 'ENOENT') return;`;

    expect(listKinds(source)).toStrictEqual(['missing-path-partial']);
  });

  it('leaves an instanceof Error inside a missing-path clone to the clone', () => {
    const source = dedent`
      function isAbsent(error: unknown): boolean {
        return error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
      }
    `;

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'missing-path-clone', line: 1, symbol: 'isAbsent' }]);
  });

  it('keeps an instanceof Error that a statement ended by a line break separates from the missing-path test', () => {
    const source = "const isErr = error instanceof Error\nif (error.code === 'ENOENT') return";

    expect(listKinds(source)).toStrictEqual(['narrow', 'missing-path-partial']);
  });

  it('leaves an instanceof Error to the missing-path test that && continues across a line break', () => {
    const source = dedent`
      if (
        error instanceof Error &&
        'code' in error
        && error.code === 'ENOENT'
      ) return;
    `;

    expect(listKinds(source)).toStrictEqual(['missing-path-partial']);
  });

  it('keeps an instanceof Error that a block, a ternary, or || separates from the missing-path test', () => {
    const source = dedent`
      if (error instanceof Error) { if ('code' in error && error.code === 'ENOENT') return; }
      const absent = error instanceof Error ? error.code === 'ENOENT' : false;
      const either = error instanceof Error || error.code === 'ENOENT';
    `;

    expect(listKinds(source)).toStrictEqual([
      'narrow',
      'missing-path-partial',
      'narrow',
      'missing-path-partial',
      'narrow',
      'missing-path-partial',
    ]);
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

  it('reports a site that the prose beside it never obscures', () => {
    const source = dedent`
      // Falls back to instanceof Error where the guard is unavailable.
      const message = error instanceof Error ? error.message : String(error);
    `;

    expect(listErrorSites(source)).toStrictEqual([{ kind: 'describe-inline', line: 2 }]);
  });
});
