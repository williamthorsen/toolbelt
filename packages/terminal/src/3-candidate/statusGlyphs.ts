import { defineGlyphSet } from './defineGlyphSet.ts';

/**
 * The statuses that a CLI reports, each with a rich and a plain rendering.
 *
 * The rich glyphs are one tonal family rather than a mix of ticks and signs, which also keeps every one of
 * them inside the rule that `defineGlyphSet` enforces. ⚠️ is what a CLI reaches for first and is a code point
 * plus a U+FE0F variation selector, so 🟠 carries `warning` instead.
 *
 * Each plain glyph is an uppercase word rather than an ASCII symbol, so `grep FAIL` finds a failure in a log.
 */
export const STATUS_GLYPHS = defineGlyphSet({
  blocked: { plain: 'BLOCK', rich: '🚫' },
  failed: { plain: 'FAIL', rich: '🔴' },
  info: { plain: 'INFO', rich: '🔵' },
  passed: { plain: 'PASS', rich: '🟢' },
  skipped: { plain: 'SKIP', rich: '⚪' },
  warning: { plain: 'WARN', rich: '🟠' },
});

/** A status that `STATUS_GLYPHS` gives a glyph. */
export type StatusGlyphName = keyof (typeof STATUS_GLYPHS)['rich'];
