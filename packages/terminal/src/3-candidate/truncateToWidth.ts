import cliTruncate from 'cli-truncate';
import sliceAnsi from 'slice-ansi';

import { measureWidth } from './measureWidth.ts';

// What marks a cut where the caller names nothing else: one code point occupying one cell.
const DEFAULT_ELLIPSIS = '…';

/**
 * Truncates text at the end to a width, counting the ellipsis inside that width rather than beyond it.
 *
 * The ellipsis is dropped where it does not fit, and the width is filled with text instead. `cli-truncate`
 * otherwise renders a three-cell `...` into a width of one or two, which is the one input on which it exceeds
 * the width that it was given.
 *
 * Never throws, where `cli-truncate` rejects a width that is infinite or not a number. An infinite width returns
 * the text unchanged, and a width at or below zero returns nothing, since truncation exists to fit and nothing
 * fits in no columns.
 *
 * The text is expected to hold no line break: a break occupies no columns, so a result containing one is laid
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
  // mark in place of the text, so an ellipsis that does not fit never reaches it.
  if (measureWidth(ellipsis) > columns) {
    return sliceAnsi(text, 0, columns);
  }

  return cliTruncate(text, columns, { truncationCharacter: ellipsis });
}

export interface TruncateToWidthOptions {
  /** What marks the cut, counted inside `width` and dropped where it does not fit there. */
  readonly ellipsis?: string | undefined;
  /** The rendered width that the result fits. */
  readonly width: number;
}
