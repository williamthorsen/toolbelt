import cliTruncate from 'cli-truncate';
import sliceAnsi from 'slice-ansi';

import { measureWidth } from './measureWidth.ts';

// What marks a cut when the caller names nothing else: one code point occupying one cell.
const DEFAULT_ELLIPSIS = '…';

/**
 * Truncates text at the end to a width, counting the ellipsis inside that width rather than beyond it.
 *
 * The ellipsis is dropped when it does not fit, and the width is filled with text instead. `cli-truncate`
 * otherwise renders a three-cell `...` into a width of one or two, which is the one input on which it exceeds
 * the width that it was given. An ellipsis of `''` marks the cut with nothing and is dropped the same way,
 * leaving the width filled with text rather than empty.
 *
 * Never throws, whereas `cli-truncate` rejects a width that is infinite or not a number. At an infinite width it
 * returns the text unchanged, and at a width at or below zero it returns nothing, since truncation exists to fit
 * and nothing fits in no columns.
 *
 * The text is expected to contain no line break: A break occupies no columns, so a result containing one is laid
 * out across lines that the width says nothing about.
 *
 * @category Terminal
 * @experimental
 * @stage candidate
 */
export function truncateToWidth(text: string, options: TruncateToWidthOptions): string {
  const { ellipsis = DEFAULT_ELLIPSIS, width } = options;

  if (width === Infinity) {
    return text;
  }

  const columns = Number.isFinite(width) ? Math.trunc(width) : 0;
  if (columns <= 0) {
    return '';
  }

  // `cli-truncate` renders a mark wider than the width that it was given, and at a width of one it renders the
  // mark in place of the text, which empties that column for a mark of no width at all. Pass neither mark to it.
  const ellipsisWidth = measureWidth(ellipsis);
  if (ellipsisWidth === 0 || ellipsisWidth > columns) {
    return sliceAnsi(text, 0, columns);
  }

  return cliTruncate(text, columns, { truncationCharacter: ellipsis });
}

export interface TruncateToWidthOptions {
  /** What marks the cut, counted inside `width` and dropped when it does not fit there. */
  readonly ellipsis?: string | undefined;
  /** The rendered width that the result fits. */
  readonly width: number;
}
