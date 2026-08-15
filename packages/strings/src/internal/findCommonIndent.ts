// Only tabs and spaces count as indentation. `\s` would admit U+FEFF, U+00A0, and U+3000, letting a
// byte-order mark zero the common indent and letting non-breaking spaces be stripped as though they
// were layout rather than content.
const INDENT_PATTERN = /^[\t ]*/;

/**
 * Returns the longest indent shared by every line, compared character by character rather than by
 * width, so that a tab and a run of spaces never appear interchangeable. Lines that should not
 * influence the result, such as whitespace-only lines, are the caller's to exclude.
 *
 * @internal
 */
export function findCommonIndent(lines: ReadonlyArray<string>): string {
  let commonIndent: string | undefined;

  for (const line of lines) {
    const indent = findLineIndent(line);
    commonIndent = commonIndent === undefined ? indent : findCommonPrefix(commonIndent, indent);
    if (commonIndent === '') return '';
  }

  return commonIndent ?? '';
}

/**
 * Returns a line's leading run of tabs and spaces.
 *
 * @internal
 */
export function findLineIndent(line: string): string {
  return INDENT_PATTERN.exec(line)?.[0] ?? '';
}

// region | Helpers

function findCommonPrefix(a: string, b: string): string {
  const limit = Math.min(a.length, b.length);
  let length = 0;
  while (length < limit && a[length] === b[length]) {
    length++;
  }
  return a.slice(0, length);
}

// endregion | Helpers
