import { findCommonIndent, isBlankText } from '../internal/indent-rules.ts';
import { joinLines, splitLines } from '../internal/text-lines.ts';

const BYTE_ORDER_MARK = '\u{FEFF}';

/**
 * Removes the indentation shared by every non-blank line, preserving each line's relative depth and its own line
 * terminator. Blank lines are emptied and no line is discarded, so the result has the same line count as the input.
 *
 * Indentation is tabs and spaces only, compared as characters rather than as widths, and blank lines are ignored
 * when it is measured. Line terminators are recognized as `\r\n`, `\n`, `\r`, `\u2028`, and `\u2029`, and each
 * is re-emitted unchanged, so CRLF text does not come back with mixed endings.
 *
 * A leading byte-order mark is set aside while the indent is measured and restored afterwards. Otherwise a file
 * read with one would have a first line that starts with neither a tab nor a space, the common indent would be
 * nothing, and the call would silently do nothing.
 *
 * The function never throws.
 *
 * @category String
 * @stage release
 */
export function stripCommonIndent(text: string): string {
  const byteOrderMark = text.startsWith(BYTE_ORDER_MARK) ? BYTE_ORDER_MARK : '';
  const lines = splitLines(text.slice(byteOrderMark.length));

  const contentLineTexts = lines.map((line) => line.text).filter((lineText) => !isBlankText(lineText));
  const commonIndent = findCommonIndent(contentLineTexts);

  const strippedLines = lines.map(({ terminator, text: lineText }) => ({
    terminator,
    text: isBlankText(lineText) ? '' : lineText.slice(commonIndent.length),
  }));

  return byteOrderMark + joinLines(strippedLines);
}
