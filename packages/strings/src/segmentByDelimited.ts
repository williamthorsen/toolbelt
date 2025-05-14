/**
 * Splits a string into segments, treating top-level delimited strings as segment boundaries.
 * @example
 * ```ts
 * segmentByDelimited('[Greetings|Hello], [stranger|world]!');
 * // => ['[Greetings|Hello], ', '[stranger|world]', '!']
 *
 * segmentByDelimited('Hello, [[friendly|unfriendly] stranger|world]!');
 * // => ['Hello, ', '[[friendly|unfriendly] stranger|world]', '!']
 * @internal
 */
export function segmentByDelimited(text: string, params: Params): string[] {
  const { opening, closing } = params;

  const result: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (text.startsWith(opening, i)) {
      if (depth === 0) {
        if (i > start) {
          result.push(text.slice(start, i));
        }
        start = i;
      }
      depth++;
      i += opening.length - 1; // account for multiple characters
    } else if (text.startsWith(closing, i)) {
      depth--;
      i += closing.length - 1; // account for multiple characters
      if (depth === 0) {
        result.push(text.slice(start, i + 1)); // include the closing delimiter
        start = i + 1;
      }
    }
  }

  if (start < text.length) {
    result.push(text.slice(start));
  }

  return result;
}

interface Params {
  opening: string;
  closing: string;
}
