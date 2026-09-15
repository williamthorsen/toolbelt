import { blankNonCode } from '@williamthorsen/toolbelt.adoption';
import { describe, expect, it } from 'vitest';

import { listLayoutBreakingTemplates } from '../listLayoutBreakingTemplates.ts';

describe(listLayoutBreakingTemplates, () => {
  it('claims usage text that drops to column 0 inside a call, at the line on which it opens', () => {
    const source = 'function help() {\n  console.info(`Usage: tool <command>\nCommands:\n  init  Set up\n`);\n}\n';

    expect(listLines(source)).toStrictEqual([2]);
  });

  it('claims markup whose closing tag drops to column 0', () => {
    const source = 'function render() {\n  return `\n    <div>\n      <p>${text}</p>\n</div>`;\n}\n';

    expect(listLines(source)).toStrictEqual([2]);
  });

  it('claims a template whose text opens a line with an interpolation at column 0', () => {
    expect(listLines('function f() {\n  return `\n${heading}\n    detail\n  `;\n}\n')).toStrictEqual([2]);
  });

  it('claims text indented with spaces beneath a line indented with a tab', () => {
    expect(listLines('function f() {\n\treturn `\n    first\n    second\n\t`;\n}\n')).toStrictEqual([2]);
  });

  it('declines a template opened at column 0', () => {
    expect(listLines('export const HELP = `\nUsage: tool <command>\n`;\n')).toStrictEqual([]);
  });

  it('declines a template whose text keeps the indentation of the line on which it opens', () => {
    expect(listLines('function f() {\n  const text = `\n    first\n    second\n  `;\n}\n')).toStrictEqual([]);
  });

  it('declines a template written on one line', () => {
    expect(listLines('function f() {\n  const text = `first`;\n}\n')).toStrictEqual([]);
  });

  it('declines a template holding nothing but its closing line', () => {
    expect(listLines('function f() {\n  const text = `\n`;\n}\n')).toStrictEqual([]);
  });

  it.each([
    ['String.raw', 'String.raw'],
    ['an existing dedent', 'dedent'],
  ])('declines a template tagged with %s', (_label, tag) => {
    expect(listLines(`function f() {\n  const text = ${tag}\`\nfirst\n\`;\n}\n`)).toStrictEqual([]);
  });

  it.each([['toMatchInlineSnapshot'], ['toThrowErrorMatchingInlineSnapshot']])(
    'declines the argument of %s, whose indentation Vitest manages',
    (matcher) => {
      expect(listLines(`it('works', () => {\n  expect(value).${matcher}(\`\nfirst\n\`);\n});\n`)).toStrictEqual([]);
    },
  );

  // A line that begins inside an interpolation is laid out as code, whatever the text around it.
  it('declines a consistently indented template holding a multi-line interpolation', () => {
    const source = 'function f() {\n  const text = `\n    first ${format(\nvalue,\n)}\n    second\n  `;\n}\n';

    expect(listLines(source)).toStrictEqual([]);
  });

  it('declines a consistently indented template with Windows line endings', () => {
    expect(listLines('function f() {\r\n  const text = `\r\n    first\r\n  `;\r\n}\r\n')).toStrictEqual([]);
  });

  it('declines a template written in a comment', () => {
    expect(listLines('function f() {\n  // const text = `\nfirst\n`;\n}\n')).toStrictEqual([]);
  });
});

// region | Helpers

/** Runs the detector over a source and the blanked code that its caller would hand it. */
function listLines(source: string): number[] {
  return listLayoutBreakingTemplates(blankNonCode(source), source);
}

// endregion | Helpers
