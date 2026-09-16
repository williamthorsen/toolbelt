import { defineGlyphSet } from './defineGlyphSet.ts';

/**
 * The statuses that a CLI reports, each with a rich and a plain rendering.
 *
 * The outcomes that a reader acts on are told apart by shape, not by hue: ✅, ❌, ⏩, and 🚫 stay distinct for
 * the roughly 8% of men with deuteranopia or protanopia, for whom a green and a red circle differ only in a
 * lightness that no emoji font guarantees. `detectOutputStyle` chooses rich output for an interactive terminal
 * outside CI, so those readers see these glyphs rather than the plain words. The two remaining circles carry
 * `info` and `warning`, whose blue and orange separate on the axis that red-green colour blindness leaves intact.
 *
 * ⚠️ is what a CLI reaches for first and is a code point plus a U+FE0F variation selector, so 🟠 carries
 * `warning` instead.
 *
 * Each plain glyph is an uppercase word rather than an ASCII symbol, so `grep FAIL` finds a failure in a log.
 */
export const STATUS_GLYPHS = defineGlyphSet({
  blocked: { plain: 'BLOCK', rich: '🚫' },
  failed: { plain: 'FAIL', rich: '❌' },
  info: { plain: 'INFO', rich: '🔵' },
  passed: { plain: 'PASS', rich: '✅' },
  skipped: { plain: 'SKIP', rich: '⏩' },
  warning: { plain: 'WARN', rich: '🟠' },
});

/** A status that `STATUS_GLYPHS` gives a glyph. */
export type StatusGlyphName = keyof (typeof STATUS_GLYPHS)['rich'];
