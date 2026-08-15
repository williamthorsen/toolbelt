import { findCommonIndent, isBlankText } from '../internal/indent-rules.ts';
import { joinLines, splitLines } from '../internal/text-lines.ts';

const BYTE_ORDER_MARK = '\u{FEFF}';

/**
 * Removes the indentation shared by every non-blank line, preserving each line's relative depth and
 * its own line terminator. Blank lines are emptied and no line is discarded, so the result has the
 * same line count as the input.
 *
 * A leading byte-order mark is held aside while the indent is measured, so a file read with one
 * still dedents.
 *
 * @category String
 * @experimental
 * @stage candidate
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
