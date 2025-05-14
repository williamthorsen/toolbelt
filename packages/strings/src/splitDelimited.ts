import { validateDelimiters } from './validateDelimiters.ts';

/**
 * Given a delimited string containing separators, removes the delimiters and splits on the separators, ignoring
 * any internal delimited strings.
 * @example
 * ```ts
 * splitDelimited('[[firstName|lastName]|world]', { opening: '[', closing: ']', separator: '|' });
 * // => ['[firstName|lastName]', 'world']
 * @internal
 */
export function splitDelimited(text: string, params: Params): string[] {
  const { opening, closing, separator } = params;

  if (!text.startsWith(opening) || !text.endsWith(closing)) {
    throw new Error(`Expected a string delimited by "${opening}" and "${closing}".`);
  }

  validateDelimiters(text, { opening, closing, throwOnError: true });

  // Remove the opening and closing delimiters
  const undelimitedText = text.slice(opening.length, -closing.length);

  const result: string[] = [];

  // Split on unnested separators
  let depth = 0;
  let lastSplit = 0;

  for (let i = 0; i < undelimitedText.length; i++) {
    if (undelimitedText.startsWith(opening, i)) {
      depth++;
      i += opening.length - 1;
    } else if (undelimitedText.startsWith(closing, i)) {
      depth--;
      i += closing.length - 1;
    } else if (depth === 0 && undelimitedText.startsWith(separator, i)) {
      result.push(undelimitedText.slice(lastSplit, i));
      i += separator.length;
      lastSplit = i;
    }
  }

  // Add the last segment if any
  if (lastSplit < undelimitedText.length) {
    result.push(undelimitedText.slice(lastSplit));
  }

  return result;
}

interface Params {
  opening: string;
  closing: string;
  separator: string;
}
