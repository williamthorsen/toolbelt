import { describe, expect, it } from 'vitest';

import { defineGlyphSet, type Glyph, measureGlyphColumn } from '../defineGlyphSet.ts';

describe(defineGlyphSet, () => {
  it('gives every name a glyph in each style', () => {
    const set = defineGlyphSet({ failed: { plain: 'FAIL', rich: '🔴' }, passed: { plain: 'PASS', rich: '🟢' } });

    expect(set.plain).toStrictEqual({ failed: { text: 'FAIL', width: 4 }, passed: { text: 'PASS', width: 4 } });
    expect(set.rich).toStrictEqual({ failed: { text: '🔴', width: 2 }, passed: { text: '🟢', width: 2 } });
  });

  // '⚪' occupies two cells with a `.length` of 1, so a width read from the string would be 1 here and 2 for '🟢'.
  it.each([
    ['⚪', 1],
    ['🟢', 2],
  ])('gives the rich glyph %s width 2 although its length is %i', (rich, length) => {
    const set = defineGlyphSet({ passed: { plain: 'PASS', rich } });

    expect(rich).toHaveLength(length);
    expect(set.rich.passed.width).toBe(2);
  });

  it('takes a plain glyph of its own length', () => {
    const set = defineGlyphSet({ blocked: { plain: 'BLOCK', rich: '🚫' } });

    expect(set.plain.blocked).toStrictEqual({ text: 'BLOCK', width: 5 });
  });

  it('accepts an empty plain glyph at width 0, which holds a column for a name with no plain word', () => {
    const set = defineGlyphSet({ kit: { plain: '', rich: '📓' } });

    expect(set.plain.kit).toStrictEqual({ text: '', width: 0 });
  });

  it.each([
    ['⚠️', 'a variation-selector pair'],
    ['ℹ️', 'a variation-selector pair'],
    ['🟢🟢', 'two code points'],
    ['•', 'a code point without Emoji_Presentation'],
    ['P', 'an ASCII letter'],
    ['', 'nothing at all'],
    // The one Emoji_Presentation range that is East_Asian_Width=Neutral alone, so width 2 would be wrong for it.
    ['\u{1F1E6}', 'a lone regional indicator'],
  ])('rejects the rich glyph %s, which is %s', (rich) => {
    expect(() => defineGlyphSet({ passed: { plain: 'PASS', rich } })).toThrow(TypeError);
  });

  it.each([
    ['✓', 'narrow-looking but outside ASCII'],
    ['→', 'narrow-looking but outside ASCII'],
    ['▶', 'ambiguous-width'],
    ['\t', 'a control character'],
  ])('rejects the plain glyph %s, which is %s', (plain) => {
    expect(() => defineGlyphSet({ passed: { plain, rich: '🟢' } })).toThrow(TypeError);
  });

  it('names the offending glyph and the rule that it broke', () => {
    expect(() => defineGlyphSet({ warning: { plain: 'WARN', rich: '⚠️' } })).toThrow(
      /"warning": rich glyph .+ is not a single Emoji_Presentation code point/,
    );
  });

  it('names every violation in one error rather than stopping at the first', () => {
    const define = (): unknown =>
      defineGlyphSet({ failed: { plain: '✗', rich: '🔴' }, warning: { plain: 'WARN', rich: '⚠️' } });

    expect(define).toThrow(/"failed": plain glyph/);
    expect(define).toThrow(/"warning": rich glyph/);
  });
});

describe(measureGlyphColumn, () => {
  it('reports the width of the widest glyph', () => {
    const set = defineGlyphSet({ blocked: { plain: 'BLOCK', rich: '🚫' }, passed: { plain: 'PASS', rich: '🟢' } });

    expect(measureGlyphColumn(set.plain)).toBe(5);
    expect(measureGlyphColumn(set.rich)).toBe(2);
  });

  it('reports 0 for a record holding no glyph', () => {
    const empty: Record<string, Glyph> = {};

    expect(measureGlyphColumn(empty)).toBe(0);
  });
});
