import wrapAnsi from 'wrap-ansi';

// Every run of whitespace, line breaks included, which collapses to one space.
const WHITESPACE_RUN = /\s+/gu;

/**
 * Collapses whitespace and wraps text greedily to a width, indenting every line or every line after the first.
 *
 * `indent` reserves its columns inside `width` rather than adding to it, so `width` is a line's full rendered
 * width and a caller passes the terminal's own. `hanging` leaves the first line's reserved columns empty of
 * spaces while narrowing it just the same, which is the shape a table needs: the row prefix fills those cells,
 * and the continuations line up beneath it.
 *
 * Wrapping is soft. A word wider than the content width stays whole on its own line and overflows, which is one
 * of the two cases in which a line measures more than `width`. The other is an indent at or above `width`, which
 * reserves every column that the line has: content floors at one column, the indent still renders in full, and
 * the line measures `indent` plus whatever it holds. The indent is left whole rather than clamped, because a
 * caller printing its own prefix into the reserved cells needs the count that it asked for.
 *
 * Whitespace collapses unconditionally, line breaks included, so text whose line structure carries meaning is
 * wrapped one paragraph at a time.
 *
 * Never throws. An infinite width wraps nothing, and a width at or below zero, or one that is not a number,
 * leaves one column for content. That floor discards nothing, since an over-long word already overflows.
 *
 * @category Terminal
 * @experimental
 * @stage candidate
 */
export function wrapToWidth(text: string, options: WrapToWidthOptions): string {
  const { hanging = false, indent = 0, width } = options;

  const collapsed = text.replace(WHITESPACE_RUN, ' ').trim();
  if (collapsed === '') {
    return '';
  }

  const reserved = resolveIndent(indent);
  const contentWidth = resolveContentWidth(width, reserved);
  const wrapped = contentWidth === Infinity ? collapsed : wrapAnsi(collapsed, contentWidth, { hard: false });
  const padding = ' '.repeat(reserved);

  return wrapped
    .split('\n')
    .map((line, index) => (hanging && index === 0 ? line : padding + line))
    .join('\n');
}

export interface WrapToWidthOptions {
  /** Whether to leave the first line's reserved columns bare, for a caller printing its own prefix there. */
  readonly hanging?: boolean | undefined;
  /** Columns reserved for the indent, taken out of `width` rather than added to it. */
  readonly indent?: number | undefined;
  /** A line's full rendered width, the indent included. */
  readonly width: number;
}

// region | Helpers

/** Resolves the columns left for content, flooring at one so that no width discards text. */
function resolveContentWidth(width: number, indent: number): number {
  if (width === Infinity) {
    return Infinity;
  }
  // `wrap-ansi` reads a `NaN` width as no width at all and returns the text unwrapped, which would silently
  // exceed whatever the caller meant, so the guard is what keeps the floor below reachable.
  if (!Number.isFinite(width)) {
    return 1;
  }
  return Math.max(1, Math.trunc(width) - indent);
}

/** Resolves the indent to a count that `repeat` accepts, which a negative or non-finite one is not. */
function resolveIndent(indent: number): number {
  return Number.isFinite(indent) ? Math.max(0, Math.trunc(indent)) : 0;
}

// endregion | Helpers
