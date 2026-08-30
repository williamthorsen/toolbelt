import { blankNonCode } from '@williamthorsen/toolbelt.adoption';
import { describe, expect, it } from 'vitest';

import { listRecordLines } from '../listRecordLines.ts';

describe(listRecordLines, () => {
  it('claims the conjunction alone, which isRecordOrArray replaces', () => {
    expect(listLines("const ok = typeof value === 'object' && value !== null;\n")).toStrictEqual([1]);
  });

  it('claims the conjunction closing with the array exclusion, which isRecord replaces', () => {
    const source = "const ok = typeof value === 'object' && value !== null && !Array.isArray(value);\n";

    expect(listLines(source)).toStrictEqual([1]);
  });

  it('claims the reversed operand order', () => {
    expect(listLines("const ok = value !== null && typeof value === 'object';\n")).toStrictEqual([1]);
  });

  it('claims the reversed order closing with the array exclusion', () => {
    const source = "const ok = value !== null && typeof value === 'object' && !Array.isArray(value);\n";

    expect(listLines(source)).toStrictEqual([1]);
  });

  // `typeof` yields 'undefined' for an absent value, so the loose test excludes exactly what the strict one does.
  it('claims a loose null test', () => {
    expect(listLines("const ok = typeof value === 'object' && value != null;\n")).toStrictEqual([1]);
  });

  it('claims a double-quoted tag', () => {
    expect(listLines('const ok = typeof value === "object" && value !== null;\n')).toStrictEqual([1]);
  });

  it('claims a subject reached through a member expression', () => {
    expect(listLines("const ok = typeof this.value === 'object' && this.value !== null;\n")).toStrictEqual([1]);
  });

  it('claims a conjunction a formatter broke across lines, at the line it opens on', () => {
    const source = "const ok =\n  typeof value === 'object' &&\n  value !== null &&\n  !Array.isArray(value);\n";

    expect(listLines(source)).toStrictEqual([2]);
  });

  // The idiom is still an exact substitution where an earlier operand precedes it.
  it('claims the idiom as the tail of a longer conjunction', () => {
    expect(listLines("const ok = ready && typeof value === 'object' && value !== null;\n")).toStrictEqual([1]);
  });

  it('claims a negated group', () => {
    expect(listLines("const no = !(typeof value === 'object' && value !== null);\n")).toStrictEqual([1]);
  });

  it('claims a conjunction a disjunction follows, which ends it', () => {
    expect(listLines("const ok = typeof value === 'object' && value !== null || fallback;\n")).toStrictEqual([1]);
  });

  it('claims each of several guards in one source', () => {
    const source = [
      "const a = typeof x === 'object' && x !== null;",
      "const b = typeof y === 'object' && y !== null && !Array.isArray(y);",
      '',
    ].join('\n');

    expect(listLines(source)).toStrictEqual([1, 2]);
  });

  // Adoption at these sites is a rewrite rather than a substitution, which is the noise the boundary excludes.
  it('declines a conjunction continuing into a property probe', () => {
    expect(listLines("const ok = typeof err === 'object' && err !== null && 'code' in err;\n")).toStrictEqual([]);
  });

  // Each operand order is matched by a pattern of its own, so a tail edit to one leaves the other unguarded.
  it('declines a reversed-order conjunction continuing into a property probe', () => {
    expect(listLines("const ok = err !== null && typeof err === 'object' && 'code' in err;\n")).toStrictEqual([]);
  });

  it('declines a reversed-order conjunction continuing past the array exclusion', () => {
    const source = "const ok = v !== null && typeof v === 'object' && !Array.isArray(v) && 'lanes' in v;\n";

    expect(listLines(source)).toStrictEqual([]);
  });

  it('declines a conjunction continuing past the array exclusion', () => {
    const source = "const ok = typeof v === 'object' && v !== null && !Array.isArray(v) && 'lanes' in v;\n";

    expect(listLines(source)).toStrictEqual([]);
  });

  it('declines a conjunction whose continuation a formatter wrapped', () => {
    const source = "const ok =\n  typeof err === 'object' &&\n  err !== null &&\n  'code' in err;\n";

    expect(listLines(source)).toStrictEqual([]);
  });

  it('declines a conjunction whose two operands test different subjects', () => {
    expect(listLines("const ok = typeof value === 'object' && other !== null;\n")).toStrictEqual([]);
  });

  it('declines an array exclusion naming a different subject', () => {
    const source = "const ok = typeof value === 'object' && value !== null && !Array.isArray(other);\n";

    expect(listLines(source)).toStrictEqual([]);
  });

  it('declines a test against another type tag', () => {
    expect(listLines("const ok = typeof value === 'function' && value !== null;\n")).toStrictEqual([]);
  });

  it('declines a null test the source does not pair with a type test', () => {
    expect(listLines('const ok = value !== null && value !== undefined;\n')).toStrictEqual([]);
  });

  it('declines the idiom written in a comment', () => {
    expect(listLines("// typeof value === 'object' && value !== null\nconst ok = true;\n")).toStrictEqual([]);
  });

  it('declines the idiom written in a string literal', () => {
    expect(listLines('const advice = "typeof value === \'object\' && value !== null";\n')).toStrictEqual([]);
  });
});

// region | Helpers

/** Blanks the source the way the merging detector does, which is what the scan reads. */
function listLines(source: string): number[] {
  return listRecordLines(blankNonCode(source), source);
}

// endregion | Helpers
