const CLOSERS = ')]}';
const OPENERS = '([{';

export interface TextSpan {
  end: number;
  start: number;
}

/**
 * Lists the span of each item between the commas that sit outside every bracket in a range of text, discarding the
 * blank tail left by a trailing comma.
 *
 * Each span keeps the item's surrounding whitespace and is offset into the whole text. An empty range yields one
 * empty span, so a caller counting items reads it as one.
 *
 * @internal
 */
export function listTopLevelSpans(text: string, start = 0, end = text.length): TextSpan[] {
  const spans: TextSpan[] = [];
  let depth = 0;
  let itemStart = start;

  for (let index = start; index < end; index += 1) {
    const character = text.charAt(index);

    if (OPENERS.includes(character)) depth += 1;
    else if (CLOSERS.includes(character)) depth -= 1;
    else if (character === ',' && depth === 0) {
      spans.push({ end: index, start: itemStart });
      itemStart = index + 1;
    }
  }
  spans.push({ end, start: itemStart });

  const last = spans.at(-1);
  if (spans.length > 1 && last !== undefined && text.slice(last.start, last.end).trim() === '') spans.pop();

  return spans;
}
