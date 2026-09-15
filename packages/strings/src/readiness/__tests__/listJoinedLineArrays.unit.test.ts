import { blankNonCode } from '@williamthorsen/toolbelt.adoption';
import { describe, expect, it } from 'vitest';

import { listJoinedLineArrays } from '../listJoinedLineArrays.ts';

describe(listJoinedLineArrays, () => {
  it('claims an array of string literals laid out one per line, at the line of its opening bracket', () => {
    expect(listLines("const text = [\n  'first',\n  '  second',\n].join('\\n');\n")).toStrictEqual([1]);
  });

  it('claims an array written with double quotes', () => {
    expect(listLines('const text = [\n  "first",\n  "second",\n].join("\\n");\n')).toStrictEqual([1]);
  });

  it('claims an array mixing template literals with string literals', () => {
    expect(listLines("const text = [\n  `name: ${name}`,\n  'role: admin',\n].join('\\n');\n")).toStrictEqual([1]);
  });

  it('claims an array ending in an empty element, which supplies a trailing newline', () => {
    expect(listLines("const text = [\n  'first',\n  'second',\n  '',\n].join('\\n');\n")).toStrictEqual([1]);
  });

  it('claims an array without a trailing comma whose brackets share lines with its elements', () => {
    expect(listLines("const text = ['first',\n  'second'].join('\\n');\n")).toStrictEqual([1]);
  });

  it('claims an array nested in a call that a formatter has wrapped', () => {
    const source = "writeFile(\n  path,\n  [\n    'first',\n    'second',\n  ].join('\\n'),\n);\n";

    expect(listLines(source)).toStrictEqual([3]);
  });

  it('claims an array returned by a function', () => {
    expect(listLines("function f() {\n  return [\n    'first',\n    'second',\n  ].join('\\n');\n}\n")).toStrictEqual([
      2,
    ]);
  });

  it('claims an array holding a comment between its elements', () => {
    expect(listLines("const text = [\n  // heading\n  'first',\n  'second',\n].join('\\n');\n")).toStrictEqual([1]);
  });

  it('claims an array whose indented elements sit beside one opening with an interpolation', () => {
    expect(listLines("const text = [\n  `${heading}`,\n  '  detail',\n].join('\\n');\n")).toStrictEqual([1]);
  });

  it('declines an array written on one line', () => {
    expect(listLines("expect(result).toBe(['Before', 'After', ''].join('\\n'));\n")).toStrictEqual([]);
  });

  it('declines an array whose content elements share an indent, which dedent would strip', () => {
    expect(listLines("const text = [\n  '  first',\n  '  second',\n  '',\n].join('\\n');\n")).toStrictEqual([]);
  });

  it('declines an array holding a single element', () => {
    expect(listLines("const text = [\n  'only',\n].join('\\n');\n")).toStrictEqual([]);
  });

  it.each([
    ['an identifier', 'heading'],
    ['a spread', '...lines'],
    ['a call', 'JSON.stringify(value)'],
    ['a tagged template', 'String.raw`first`'],
    ['a concatenation', "'first' + suffix"],
  ])('declines an array holding %s', (_label, element) => {
    expect(listLines(`const text = [\n  ${element},\n  'second',\n].join('\\n');\n`)).toStrictEqual([]);
  });

  it.each([
    ['an identifier', 'EOL'],
    ['another literal', "', '"],
    ['an empty literal', "''"],
  ])('declines an array joined with %s', (_label, separator) => {
    expect(listLines(`const text = [\n  'first',\n  'second',\n].join(${separator});\n`)).toStrictEqual([]);
  });

  it('declines an array built elsewhere and joined by name', () => {
    expect(listLines("const lines = [];\nlines.push('first');\nconst text = lines.join('\\n');\n")).toStrictEqual([]);
  });

  it('declines a subscript', () => {
    expect(listLines("const text = table[\n  'first',\n  'second'\n].join('\\n');\n")).toStrictEqual([]);
  });

  it('declines an array written in a comment', () => {
    expect(listLines("// const text = [\n//   'first',\n//   'second',\n// ].join('\\n');\n")).toStrictEqual([]);
  });
});

// region | Helpers

/** Runs the detector over a source and the blanked code that its caller would hand it. */
function listLines(source: string): number[] {
  return listJoinedLineArrays(blankNonCode(source), source);
}

// endregion | Helpers
