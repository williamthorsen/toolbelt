import { expectTypeOf } from 'expect-type';
import { describe, expect, it } from 'vitest';

import { dedent, type DedentValue } from '../dedent.ts';

describe(dedent, () => {
  it('discards the opening line and a blank closing line', () => {
    expect(dedent`
      first line
      second line
    `).toBe('first line\nsecond line');
  });

  it('unindents a closing line that is not blank, rather than discarding it', () => {
    // eslint-disable-next-line unicorn/template-indent -- the closing backtick sits on the content line deliberately; moving it to its own line is the case this test exists to distinguish from.
    expect(dedent`
      first line
      last line`).toBe('first line\nlast line');
  });

  it('preserves relative depth', () => {
    expect(dedent`
      indent 6
        indent 8
      indent 6
    `).toBe('indent 6\n  indent 8\nindent 6');
  });

  it('strips nothing when a content line starts at column zero, rather than throwing', () => {
    expect(
      // eslint-disable-next-line unicorn/template-indent -- the flush-left line is the case under test; indenting it would remove the column-zero line the escape hatch turns on.
      dedent`
alpha
  beta
      `,
    ).toBe('alpha\n  beta');
  });

  it('keeps a trailing newline when a blank line precedes the closing backtick', () => {
    expect(dedent`
      alpha

    `).toBe('alpha\n');
  });

  it('returns only the line breaks when every line is blank', () => {
    expect(dedent`


    `).toBe('\n');
  });

  it('throws when the first line is not blank', () => {
    expect(() => dedent`not empty`).toThrow(/first line/);
  });

  it('accepts an opening line carrying trailing whitespace', () => {
    // Built by hand because `.editorconfig` and the formatter strip trailing whitespace from source,
    // so this case cannot be written as a template literal.
    const source = '   \n      alpha\n    ';
    const templateStrings = Object.assign([source], { raw: [source] });

    expect(dedent(templateStrings)).toBe('alpha');
  });

  it('preserves an escaped backtick, which relies on reading the cooked strings', () => {
    expect(dedent`
      run \`command\`
    `).toBe('run `command`');
  });

  describe('defect regressions', () => {
    it('A: ignores a blank line shallower than the content when measuring', () => {
      expect(dedent`
        alpha

        beta
      `).toBe('alpha\n\nbeta');
    });

    it('B: measures the indent before splicing, so a multi-line value cannot flatten it', () => {
      const block = 'x\ny';
      expect(dedent`
        before
        ${block}
        after
      `).toBe('before\nx\ny\nafter');
    });

    it('B: rejects an escaped line terminator, which would flatten the indent the same way', () => {
      expect(
        () => dedent`
          alpha\nbeta
          gamma
        `,
      ).toThrow(/escaped line terminator|line continuation/);
    });

    it('C: rejects indentation that mixes tabs and spaces irreconcilably', () => {
      expect(
        // eslint-disable-next-line unicorn/template-indent -- one line is tab-indented and the other space-indented; normalizing them would remove the disagreement under test.
        () => dedent`
\talpha
        beta
        `,
      ).toThrow(/share no common indentation/);
    });

    // D and E are compile-time rejections, so their regression tests are type assertions: widening
    // `DedentValue` would restore the runtime coercions without failing a runtime assertion.
    it('D: rejects a nullish value, which coerced to the empty string', () => {
      expectTypeOf<null>().not.toExtend<DedentValue>();
      expectTypeOf<undefined>().not.toExtend<DedentValue>();
      expectTypeOf(dedent).parameter(1).toEqualTypeOf<DedentValue>();
    });

    it('E: rejects an object, which coerced to "[object Object]"', () => {
      expectTypeOf<{ a: number }>().not.toExtend<DedentValue>();
      expectTypeOf<Date>().not.toExtend<DedentValue>();
    });
  });

  describe('values', () => {
    it('splices a single-line value in place', () => {
      const delimiter = '|';
      const value = 'new value';
      expect(dedent`
        ${delimiter}${value}${delimiter}
      `).toBe('|new value|');
    });

    it('renders a value holding a line the author did not indent', () => {
      expect(dedent`
        alpha
        ${'x\ny'}
      `).toBe('alpha\nx\ny');
    });

    it('treats a line holding a value as content when measuring', () => {
      expect(dedent`
            alpha
        ${''}
      `).toBe('    alpha\n');
    });
  });

  describe('withOptions', () => {
    it('leaves the default tag unaffected', () => {
      const indented = dedent.withOptions({ valueIndentationStyle: 'line' });

      expect(indented`
      Items:
        ${'alpha\nbeta'}
    `).toBe('Items:\n  alpha\n  beta');

      expect(dedent`
        Items:
          ${'alpha\nbeta'}
      `).toBe('Items:\n  alpha\nbeta');
    });

    it('indents continuation lines to the line the value opened on', () => {
      const indented = dedent.withOptions({ valueIndentationStyle: 'line' });

      expect(indented`
      Item:
        Name: ${'alpha\nbeta'}
    `).toBe('Item:\n  Name: alpha\n  beta');
    });

    it('leaves a blank line inside a value blank', () => {
      const indented = dedent.withOptions({ valueIndentationStyle: 'line' });

      expect(indented`
      Items:
        ${'alpha\n\nbeta'}
    `).toBe('Items:\n  alpha\n\n  beta');
    });

    it('inherits the receiver when an override is undefined', () => {
      const indented = dedent.withOptions({ valueIndentationStyle: 'line' });
      const inherited = indented.withOptions({ valueIndentationStyle: undefined });

      expect(inherited`
      Items:
        ${'alpha\nbeta'}
    `).toBe('Items:\n  alpha\n  beta');
    });
  });

  it('reports its own name, so the suite title resolves', () => {
    expect(dedent.name).toBe('dedent');
    expect(dedent.withOptions({}).name).toBe('dedent');
  });
});
