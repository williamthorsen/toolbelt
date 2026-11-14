import { blankNonCode } from '@williamthorsen/toolbelt.adoption';
import { describe, expect, it } from 'vitest';

import { listMissingPathSites, type MissingPathSiteKind } from '../listMissingPathSites.ts';

describe(listMissingPathSites, () => {
  it('names a test of both codes', () => {
    const source = "if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return undefined;";

    expect(listKinds(source)).toStrictEqual(['missing-path-test']);
  });

  it('names a test of one code as partial', () => {
    expect(listKinds("if (error.code === 'ENOENT') return undefined;")).toStrictEqual(['missing-path-partial']);
    expect(listKinds("if (error.code === 'ENOTDIR') return undefined;")).toStrictEqual(['missing-path-partial']);
  });

  it('names a negated pair joined by && as one test', () => {
    const source = "if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;";

    expect(listKinds(source)).toStrictEqual(['missing-path-test']);
  });

  it('names a test wrapped across lines by a formatter', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
    const source = ['if (', "  error.code === 'ENOENT' ||", "  error.code === 'ENOTDIR'", ') {', '  return;', '}'].join(
      '\n',
    );

    expect(listMissingPathSites(source, blankNonCode(source))).toMatchObject([{ kind: 'missing-path-test', line: 2 }]);
  });

  it('reads the literal on either side, any equality operator, and optional chaining', () => {
    expect(listKinds("const absent = 'ENOENT' == error?.code;")).toStrictEqual(['missing-path-partial']);
    expect(listKinds('const absent = "ENOTDIR" != err.code;')).toStrictEqual(['missing-path-partial']);
    expect(listKinds("const absent = error?.code === 'ENOENT' || error.code === 'ENOTDIR';")).toStrictEqual([
      'missing-path-test',
    ]);
  });

  it('reads a destructured code and a parenthesized operand', () => {
    expect(listKinds("const { code } = error;\nif (code === 'ENOENT') return;")).toStrictEqual([
      'missing-path-partial',
    ]);
    expect(listKinds("if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;")).toStrictEqual([
      'missing-path-partial',
    ]);
  });

  it('joins comparisons that parentheses wrap', () => {
    const source = "const absent = (error.code === 'ENOENT') || (error.code === 'ENOTDIR');";

    expect(listKinds(source)).toStrictEqual(['missing-path-test']);
  });

  it('keeps comparisons of differently written operands apart', () => {
    const source = "const absent = (error as NodeJS.ErrnoException).code === 'ENOENT' || error.code === 'ENOTDIR';";

    expect(listKinds(source)).toStrictEqual(['missing-path-partial', 'missing-path-partial']);
  });

  it('ignores every other code', () => {
    expect(listKinds("if (error.code === 'EACCES') throw error;")).toStrictEqual([]);
  });

  it('ignores a code named in a comment or a string, and a switch over the code', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
    const source = [
      "// error.code === 'ENOENT' means the file is gone",
      'const hint = "error.code === \'ENOENT\'";',
      'switch (error.code) {',
      "  case 'ENOENT':",
      '    return;',
      '}',
    ].join('\n');

    expect(listKinds(source)).toStrictEqual([]);
  });

  it('names a helper testing its own parameter for both codes as a clone, once, with its name', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
    const source = [
      'export function isNotFound(error: unknown): boolean {',
      '  return (',
      "    typeof error === 'object' &&",
      '    error !== null &&',
      "    'code' in error &&",
      "    (error.code === 'ENOENT' || error.code === 'ENOTDIR')",
      '  );',
      '}',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([{ kind: 'missing-path-clone', line: 1, symbol: 'isNotFound' }]);
  });

  it('names a helper testing the two codes in separate statements as a clone', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
    const source = [
      'const isAbsent = (error: NodeJS.ErrnoException): boolean => {',
      "  if (error.code === 'ENOENT') return true;",
      "  return error.code === 'ENOTDIR';",
      '};',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([{ kind: 'missing-path-clone', line: 1, symbol: 'isAbsent' }]);
  });

  it('reports a helper testing one code at its comparison, as partial', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
    const source = [
      'function isNotFound(error: NodeJS.ErrnoException): boolean {',
      "  return error.code === 'ENOENT';",
      '}',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([{ kind: 'missing-path-partial', line: 2 }]);
  });

  it('leaves a helper that maps the codes to other values to the per-site report', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
    const source = [
      'function label(error: NodeJS.ErrnoException): string {',
      "  if (error.code === 'ENOENT') return 'missing';",
      "  if (error.code === 'ENOTDIR') return 'not a directory';",
      "  return 'other';",
      '}',
    ].join('\n');

    expect(listKinds(source)).toStrictEqual(['missing-path-partial', 'missing-path-partial']);
  });

  it('leaves a helper that negates the test to the per-site report', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
    const source = [
      'function isPresent(error: NodeJS.ErrnoException): boolean {',
      "  return error.code !== 'ENOENT' && error.code !== 'ENOTDIR';",
      '}',
    ].join('\n');

    expect(listKinds(source)).toStrictEqual(['missing-path-test']);
  });

  it('leaves a helper that does more than test, or tests another value, to the per-site report', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
    const source = [
      'function readOptional(file: string): string | undefined {',
      '  try {',
      '    return fs.readFileSync(file, "utf8");',
      '  } catch (error) {',
      "    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return undefined;",
      '    throw error;',
      '  }',
      '}',
    ].join('\n');

    expect(listKinds(source)).toStrictEqual(['missing-path-test']);
  });

  it('reports every site in a file, in source order', () => {
    const source = "if (a.code === 'ENOTDIR') x();\nif (b.code === 'ENOENT' || b.code === 'ENOTDIR') y();";

    expect(listSites(source)).toStrictEqual([
      { kind: 'missing-path-partial', line: 1 },
      { kind: 'missing-path-test', line: 2 },
    ]);
  });
});

// region | Helpers

/** Names the kind of every site in a source, on which each case asserts. */
function listKinds(source: string): MissingPathSiteKind[] {
  return listMissingPathSites(source, blankNonCode(source)).map((site) => site.kind);
}

/** Lists every site in a source without its offsets, which no case asserts. */
function listSites(source: string): Array<{ kind: MissingPathSiteKind; line: number; symbol?: string }> {
  return listMissingPathSites(source, blankNonCode(source)).map(({ end: _end, start: _start, ...site }) => site);
}

// endregion | Helpers
