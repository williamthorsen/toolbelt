import { listSiteLines } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listJoinedLineArraySites } from '../listJoinedLineArraySites.ts';

describe(listJoinedLineArraySites, () => {
  it('claims an array of string literals laid out one per line, at the line of its opening bracket', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, "const text = [\n  'first',\n  '  second',\n].join('\\n');\n"),
    ).toStrictEqual([1]);
  });

  it('claims an array written with double quotes', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, 'const text = [\n  "first",\n  "second",\n].join("\\n");\n'),
    ).toStrictEqual([1]);
  });

  it('claims an array mixing template literals with string literals', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, "const text = [\n  `name: ${name}`,\n  'role: admin',\n].join('\\n');\n"),
    ).toStrictEqual([1]);
  });

  it('claims an array ending in an empty element, which supplies a trailing newline', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, "const text = [\n  'first',\n  'second',\n  '',\n].join('\\n');\n"),
    ).toStrictEqual([1]);
  });

  it('claims an array without a trailing comma whose brackets share lines with its elements', () => {
    expect(listSiteLines(listJoinedLineArraySites, "const text = ['first',\n  'second'].join('\\n');\n")).toStrictEqual(
      [1],
    );
  });

  it('claims an array nested in a call that a formatter has wrapped', () => {
    const source = "writeFile(\n  path,\n  [\n    'first',\n    'second',\n  ].join('\\n'),\n);\n";

    expect(listSiteLines(listJoinedLineArraySites, source)).toStrictEqual([3]);
  });

  it('claims an array returned by a function', () => {
    expect(
      listSiteLines(
        listJoinedLineArraySites,
        "function f() {\n  return [\n    'first',\n    'second',\n  ].join('\\n');\n}\n",
      ),
    ).toStrictEqual([2]);
  });

  it('claims an array containing a comment between its elements', () => {
    expect(
      listSiteLines(
        listJoinedLineArraySites,
        "const text = [\n  // heading\n  'first',\n  'second',\n].join('\\n');\n",
      ),
    ).toStrictEqual([1]);
  });

  it('claims an array whose indented elements are next to one opening with an interpolation', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, "const text = [\n  `${heading}`,\n  '  detail',\n].join('\\n');\n"),
    ).toStrictEqual([1]);
  });

  it('declines an array written on one line', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, "expect(result).toBe(['Before', 'After', ''].join('\\n'));\n"),
    ).toStrictEqual([]);
  });

  it('declines an array whose content elements share an indent, which dedent would strip', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, "const text = [\n  '  first',\n  '  second',\n  '',\n].join('\\n');\n"),
    ).toStrictEqual([]);
  });

  it('declines an array with a single element', () => {
    expect(listSiteLines(listJoinedLineArraySites, "const text = [\n  'only',\n].join('\\n');\n")).toStrictEqual([]);
  });

  it.each([
    ['an identifier', 'heading'],
    ['a spread', '...lines'],
    ['a call', 'JSON.stringify(value)'],
    ['a tagged template', 'String.raw`first`'],
    ['a concatenation', "'first' + suffix"],
  ])('declines an array containing %s', (_label, element) => {
    expect(
      listSiteLines(listJoinedLineArraySites, `const text = [\n  ${element},\n  'second',\n].join('\\n');\n`),
    ).toStrictEqual([]);
  });

  it.each([
    ['an identifier', 'EOL'],
    ['another literal', "', '"],
    ['an empty literal', "''"],
  ])('declines an array joined with %s', (_label, separator) => {
    expect(
      listSiteLines(listJoinedLineArraySites, `const text = [\n  'first',\n  'second',\n].join(${separator});\n`),
    ).toStrictEqual([]);
  });

  it('declines an array built elsewhere and joined by name', () => {
    expect(
      listSiteLines(
        listJoinedLineArraySites,
        "const lines = [];\nlines.push('first');\nconst text = lines.join('\\n');\n",
      ),
    ).toStrictEqual([]);
  });

  it('declines a subscript', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, "const text = table[\n  'first',\n  'second'\n].join('\\n');\n"),
    ).toStrictEqual([]);
  });

  it('declines an array written in a comment', () => {
    expect(
      listSiteLines(listJoinedLineArraySites, "// const text = [\n//   'first',\n//   'second',\n// ].join('\\n');\n"),
    ).toStrictEqual([]);
  });
});
