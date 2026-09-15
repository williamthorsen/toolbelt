import { blankNonCode } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

import { listTemplateLiterals } from '../listTemplateLiterals.ts';

describe(listTemplateLiterals, () => {
  it('spans a template from its opening backtick to one past its closing one', () => {
    expect(summarize('const a = `text`;')).toStrictEqual([{ interpolations: [], isTagged: false, text: '`text`' }]);
  });

  it('spans a template across lines', () => {
    expect(summarize('const a = `\n  one\n  two\n`;')).toStrictEqual([
      { interpolations: [], isTagged: false, text: '`\n  one\n  two\n`' },
    ]);
  });

  it('lists each interpolation from its `$` to one past its closing brace', () => {
    expect(summarize('const a = `x ${first} y ${second}`;')).toStrictEqual([
      { interpolations: ['${first}', '${second}'], isTagged: false, text: '`x ${first} y ${second}`' },
    ]);
  });

  it('ends an interpolation at its own closing brace, past braces nested in its code', () => {
    expect(summarize('const a = `${fn({ b: { c: 1 } })} tail`;')).toStrictEqual([
      { interpolations: ['${fn({ b: { c: 1 } })}'], isTagged: false, text: '`${fn({ b: { c: 1 } })} tail`' },
    ]);
  });

  it('lists a template nested in an interpolation after the template holding it', () => {
    expect(summarize('const a = `outer ${`inner`} end`;').map((template) => template.text)).toStrictEqual([
      '`outer ${`inner`} end`',
      '`inner`',
    ]);
  });

  it('ignores backticks and braces inside strings, comments, and a template’s own text', () => {
    const source = "const a = '`'; // `\nconst b = `{ \\` ${'}'} }`;";

    expect(summarize(source).map((template) => template.text)).toStrictEqual(["`{ \\` ${'}'} }`"]);
  });

  it('lists each template where a source holds several', () => {
    expect(summarize('f(`a`, `b`);\ng(`c`);').map((template) => template.text)).toStrictEqual(['`a`', '`b`', '`c`']);
  });

  it.each([
    ['an identifier', 'dedent`x`'],
    ['a member', 'String.raw`x`'],
    ['a member reached through whitespace', 'String.raw\n  `x`'],
    ['a call', 'build()`x`'],
    ['a subscript', 'tags[0]`x`'],
    ['a member named like a keyword', 'tags.return`x`'],
    ['an identifier with type arguments', 'sql<Row[]>`x`'],
    ['a member with type arguments', 'styled.div<Props>`x`'],
  ])('reports a template following %s as tagged', (_label, source) => {
    expect(summarize(source).map((template) => template.isTagged)).toStrictEqual([true]);
  });

  it.each([
    ['the start of the source', '`x`'],
    ['an assignment', 'const a = `x`;'],
    ['an opening parenthesis', 'f(`x`)'],
    ['a comma', 'f(a, `x`)'],
    ['an arrow', 'const f = () => `x`;'],
    ['return', 'return `x`;'],
    ['await', 'await `x`;'],
    ['a closing brace', 'if (a) {}\n`x`;'],
  ])('reports a template following %s as untagged', (_label, source) => {
    expect(summarize(source).map((template) => template.isTagged)).toStrictEqual([false]);
  });

  it('lists nothing from a template that never closes, and keeps the templates before it', () => {
    expect(summarize('const a = `done`;\nconst b = `open ${value}').map((template) => template.text)).toStrictEqual([
      '`done`',
    ]);
  });

  it('lists neither template where a nested one never closes', () => {
    expect(summarize('const a = `outer ${`inner ${value}')).toStrictEqual([]);
  });
});

// region | Helpers

/** Lists each template found in the blanked source, with the source text spanned by it and by its interpolations. */
function summarize(source: string): Array<{ interpolations: string[]; isTagged: boolean; text: string }> {
  return listTemplateLiterals(blankNonCode(source)).map((template) => ({
    interpolations: template.interpolations.map((interpolation) =>
      source.slice(interpolation.start, interpolation.end),
    ),
    isTagged: template.isTagged,
    text: source.slice(template.start, template.end),
  }));
}

// endregion | Helpers
