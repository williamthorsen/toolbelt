import { describe, expect, it } from 'vitest';

import { dedent } from '../dedent.ts';

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

  it('returns only the line breaks when every line is blank', () => {
    expect(dedent`


    `).toBe('\n');
  });

  it('throws when the first line is not blank', () => {
    expect(() => dedent`not empty`).toThrow(/first line/);
  });

  it('accepts an opening line of invisible trailing whitespace', () => {
    expect(dedent`
      alpha
    `).toBe('alpha');
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

    it('E: preserves an escaped backtick, which relies on cooked strings', () => {
      expect(dedent`
        run \`command\`
      `).toBe('run `command`');
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
