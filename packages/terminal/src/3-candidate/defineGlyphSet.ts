import type { OutputStyle } from './detectOutputStyle.ts';

// Printable ASCII, every code point of which carries `East_Asian_Width=Narrow`, so its length is its cell count.
// A narrow-looking character outside the range need not be: `→` and `▶` carry `East_Asian_Width=Ambiguous` and
// so measure one cell or two by locale. The range is also the one that survives a CI log, a `grep`, a screen
// reader, and a terminal with no emoji font.
const PLAIN_PATTERN = /^[\u{20}-\u{7E}]*$/u;

// One code point carrying `Emoji_Presentation=Yes`, excluding the regional indicators. The anchors carry the
// single-code-point rule on their own, because the class matches a code point rather than a UTF-16 unit.
//
// Every code point that this class admits carries `East_Asian_Width=Wide`, which is what fixes `RICH_WIDTH`.
// The 26 regional indicators are the only `Emoji_Presentation=Yes` code points that do not: each is
// `East_Asian_Width=Neutral` alone and reaches two cells only in the pair that forms a flag.
const RICH_PATTERN = /^[\p{Emoji_Presentation}--\p{Regional_Indicator}]$/v;

// Cells occupied by every code point that `RICH_PATTERN` admits.
const RICH_WIDTH = 2;

/**
 * Assembles a glyph set from each name's two renderings, deriving every width from the rules that it enforces.
 *
 * A rich variant is one code point with `Emoji_Presentation=Yes` and outside the regional indicators, which
 * makes it two cells wide without a U+FE0F variation selector. A code point lacking that property renders one
 * cell wide in some terminals and two in others, so no declared width would be right everywhere; ⚠️, ℹ️, and
 * ⏭️ are refused on that rule.
 *
 * A plain variant is printable ASCII, whose width is its length. `'✓'` and `'→'` are refused although each
 * looks one cell wide: `'→'` measures one cell or two by locale, and `'✓'` survives no terminal that lacks an
 * emoji font, which is what a plain variant exists for. An empty plain variant is legal at width 0, which lets
 * a name carry a rich decoration and no plain counterpart while still holding its column.
 *
 * Throws where `resolveOutputStyle` reports, because a set is built from the author's own literals at module
 * load: A violation is a programming error rather than input whose complaint has to be rendered somehow. One
 * error names every violation, so the set is repaired in a single pass.
 *
 * @category Terminal
 * @experimental
 * @stage candidate
 */
export function defineGlyphSet<Name extends string>(variants: Readonly<Record<Name, GlyphVariants>>): GlyphSet<Name> {
  const entries = listVariantEntries(variants);
  const violations = entries.flatMap(([name, variant]) => listViolations(name, variant));

  if (violations.length > 0) {
    throw new TypeError(`Glyph set is invalid.\n${violations.map((violation) => `- ${violation}`).join('\n')}`);
  }

  return {
    plain: toGlyphRecord(entries.map(([name, { plain }]) => [name, { text: plain, width: plain.length }])),
    rich: toGlyphRecord(entries.map(([name, { rich }]) => [name, { text: rich, width: RICH_WIDTH }])),
  };
}

/**
 * Reports the cells taken by the widest glyph in a record, which is the column width that aligns every one of them.
 *
 * Takes one style's record rather than a set and a style, so a caller passes what indexing already gave it. A
 * gutter is this width plus whatever separates the column from the text beside it.
 *
 * @category Terminal
 * @experimental
 * @stage candidate
 */
export function measureGlyphColumn(glyphs: Readonly<Record<string, Glyph>>): number {
  const widths = Object.values(glyphs).map((glyph) => glyph.width);

  return widths.length === 0 ? 0 : Math.max(...widths);
}

/** Text to print, and the terminal cells that it occupies. */
export interface Glyph {
  readonly text: string;
  readonly width: number;
}

/** Every name's glyph in each style, read as `set[style][name]`. */
export type GlyphSet<Name extends string> = Readonly<Record<OutputStyle, Readonly<Record<Name, Glyph>>>>;

/** The two renderings of one name. `defineGlyphSet` derives each width; neither is declared here. */
export interface GlyphVariants {
  readonly plain: string;
  readonly rich: string;
}

// region | Helpers

/** Lists a variant record's entries, restoring the key type that `Object.entries` widens to `string`. */
function listVariantEntries<Name extends string>(
  variants: Readonly<Record<Name, GlyphVariants>>,
): Array<[Name, GlyphVariants]> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.entries widens keys to string; the assertion restores them.
  return Object.entries(variants) as Array<[Name, GlyphVariants]>;
}

/** Lists what a name's variants violate, empty where each one satisfies its rule. */
function listViolations(name: string, variants: GlyphVariants): string[] {
  const violations: string[] = [];
  const subject = JSON.stringify(name);

  if (!RICH_PATTERN.test(variants.rich)) {
    const glyph = JSON.stringify(variants.rich);
    violations.push(
      `${subject}: rich glyph ${glyph} is not a single Emoji_Presentation code point outside the regional indicators.`,
    );
  }
  if (!PLAIN_PATTERN.test(variants.plain)) {
    const glyph = JSON.stringify(variants.plain);
    violations.push(`${subject}: plain glyph ${glyph} is not printable ASCII (U+0020 to U+007E).`);
  }

  return violations;
}

/** Type-preserving wrapper around `Object.fromEntries`. */
function toGlyphRecord<Name extends string>(entries: Array<[Name, Glyph]>): Record<Name, Glyph> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.fromEntries widens keys to string; the assertion restores them.
  return Object.fromEntries(entries) as Record<Name, Glyph>;
}

// endregion | Helpers
