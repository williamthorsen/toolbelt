/**
 * A line of text paired with the terminator that followed it. The final line of any text carries an
 * empty terminator.
 */
export interface TextLine {
  terminator: string;
  text: string;
}

/**
 * Reassembles lines into text, restoring each line's own terminator.
 *
 * @internal
 */
export function joinLines(lines: ReadonlyArray<TextLine>): string {
  return lines.map((line) => line.text + line.terminator).join('');
}

/**
 * Splits text into lines, retaining each line's terminator so that a round trip preserves mixed or
 * non-LF line endings.
 *
 * @internal
 */
export function splitLines(text: string): TextLine[] {
  // The capturing group keeps the terminators in the result, interleaved with the line texts.
  const parts = text.split(/(\r\n|[\n\r\u{2028}\u{2029}])/u);

  const lines: TextLine[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    lines.push({ terminator: parts[index + 1] ?? '', text: parts[index] ?? '' });
  }
  return lines;
}
