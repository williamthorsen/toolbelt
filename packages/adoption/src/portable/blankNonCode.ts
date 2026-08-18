// Punctuation a `/` may follow and still open a regular expression. `)` and `]` are left out on purpose: both
// end an expression that division takes as its left operand, and division after them is far commoner than a
// regular expression is.
const REGEX_PRECEDERS = new Set([
  '!',
  '%',
  '&',
  '(',
  '*',
  '+',
  ',',
  '-',
  ':',
  ';',
  '=',
  '>',
  '?',
  '[',
  '^',
  '{',
  '|',
  '~',
]);
// Keywords a `/` may follow and still open a regular expression, each one taking an expression after it. Kept
// apart from the set `site-handoffs.ts` holds, which answers a different question over an overlapping list.
const EXPRESSION_KEYWORDS = new Set([
  'await',
  'case',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'typeof',
  'void',
  'yield',
]);
const WORD_CHAR = /[\w$]/;

interface Scan {
  out: string[];
  source: string;
}

/**
 * Returns the source with every comment and every literal's text replaced by spaces.
 *
 * A detector's anchor scan reads the result, so an idiom written in prose is invisible to it while the code
 * around the prose is not. The output matches the input in length and in every newline position, which is what
 * lets a caller take an offset from one text and read the other at it: a reported line still names the line the
 * source holds, and an anchor whose own match spans a literal can still be read back whole.
 *
 * Delimiters survive and only the text between them blanks, because a literal is an operand: `isArraySubscript`
 * reads a quote as a token a subscript bracket may follow, so blanking the quotes would turn `'abc'[0]` into an
 * array literal. A comment blanks whole, being no operand at all, and an expression interpolated into a template
 * literal is code that runs and stays visible.
 *
 * Where a `/` could open a regular expression or divide, the ambiguity resolves toward division, and a quoted
 * string or regular expression whose closing delimiter never arrives on its line was neither. A misjudgment
 * therefore leaves text standing, which is what a detector reads today, rather than blanking an expression that
 * runs. JSX is the one exception, being read here as the JavaScript it is not: `>` has to open a regular
 * expression because `=>` does, so a text node beginning with `/` blanks as far as its closing tag's slash.
 *
 * @internal
 */
export function blankNonCode(source: string): string {
  const scan: Scan = { out: source.split(''), source };
  const start = source.startsWith('#!') ? blankSpan(scan, 0, findLineEnd(source, 0)) : 0;

  scanCode(scan, start, false);

  return scan.out.join('');
}

// region | Helpers

/** Blanks a quoted string's text and returns the offset past its closing delimiter, or past the opening one
 * where the line ends first. */
function blankQuoted(scan: Scan, start: number, quote: string): number {
  const { source } = scan;
  let index = start + 1;

  while (index < source.length) {
    const char = source[index];
    // A backslash escapes the next character, a newline included, which is how a string spans a line break.
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '\n') break;
    if (char === quote) return blankSpan(scan, start + 1, index) + 1;
    index += 1;
  }

  return start + 1;
}

/** Blanks every character in a span but its line breaks, and returns the span's end. */
function blankSpan(scan: Scan, from: number, to: number): number {
  for (let index = from; index < to; index += 1) {
    const char = scan.source[index];
    if (char !== '\n' && char !== '\r') scan.out[index] = ' ';
  }
  return to;
}

/** Blanks a template literal's text, leaving each interpolated expression as code, and returns the offset past
 * its closing backtick. */
function blankTemplate(scan: Scan, start: number): number {
  const { source } = scan;
  let index = start + 1;
  let textStart = index;

  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '`') return blankSpan(scan, textStart, index) + 1;
    if (char === '$' && source[index + 1] === '{') {
      blankSpan(scan, textStart, index);
      const close = scanCode(scan, index + 2, true);
      index = close < source.length ? close + 1 : close;
      textStart = index;
      continue;
    }
    index += 1;
  }

  // A template legitimately spans lines, so an unterminated one has no line to fall back to.
  return blankSpan(scan, textStart, source.length);
}

/** Returns the offset past a block comment's terminator, or the source's end where it never closes. */
function findBlockCommentEnd(source: string, from: number): number {
  const end = source.indexOf('*/', from + 2);
  return end === -1 ? source.length : end + 2;
}

/** Returns the offset of the line break ending the line an offset sits on, or the source's end. */
function findLineEnd(source: string, from: number): number {
  const end = source.indexOf('\n', from);
  return end === -1 ? source.length : end;
}

/** Returns the offset past a regular expression's closing delimiter, or nothing where the line ends first. */
function findRegexEnd(source: string, start: number): number | undefined {
  let index = start + 1;
  let isInClass = false;

  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '\n') return undefined;
    // A `/` inside a character class is a literal slash rather than the terminator.
    if (char === '[') isInClass = true;
    else if (char === ']') isInClass = false;
    else if (char === '/' && !isInClass) return index + 1;
    index += 1;
  }

  return undefined;
}

/** Returns the offset past the word beginning at an offset. */
function findWordEnd(source: string, from: number): number {
  let index = from;
  while (index < source.length && WORD_CHAR.test(source[index] ?? '')) index += 1;
  return index;
}

/**
 * Scans code from an offset, blanking every comment and literal it meets, and returns where it stopped.
 *
 * Stops at the `}` closing an interpolation when scanning one, and at the source's end otherwise. Braces opened
 * inside the interpolation are counted, so an object literal or a block in there closes itself rather than the
 * interpolation around it.
 */
function scanCode(scan: Scan, from: number, isInterpolation: boolean): number {
  const { source } = scan;
  // The last thing seen that was neither whitespace nor a comment: a word, or a single punctuation character.
  let previousToken = '';
  let braceDepth = 0;
  let index = from;

  while (index < source.length) {
    const char = source[index] ?? '';
    const next = source[index + 1];

    if (char === '/' && next === '/') {
      index = blankSpan(scan, index, findLineEnd(source, index));
      continue;
    }
    if (char === '/' && next === '*') {
      index = blankSpan(scan, index, findBlockCommentEnd(source, index));
      continue;
    }
    if (char === "'" || char === '"') {
      index = blankQuoted(scan, index, char);
      previousToken = char;
      continue;
    }
    if (char === '`') {
      index = blankTemplate(scan, index);
      previousToken = char;
      continue;
    }
    if (char === '/' && startsRegex(previousToken)) {
      const end = findRegexEnd(source, index);
      if (end !== undefined) {
        blankSpan(scan, index + 1, end - 1);
        index = end;
        previousToken = '/';
        continue;
      }
    }

    if (isInterpolation && char === '{') braceDepth += 1;
    else if (isInterpolation && char === '}') {
      if (braceDepth === 0) return index;
      braceDepth -= 1;
    }

    if (WORD_CHAR.test(char)) {
      const end = findWordEnd(source, index);
      previousToken = source.slice(index, end);
      index = end;
      continue;
    }

    if (!/\s/.test(char)) previousToken = char;
    index += 1;
  }

  return index;
}

/** Reports whether a `/` following the given token opens a regular expression rather than dividing. */
function startsRegex(previousToken: string): boolean {
  if (previousToken === '') return true;
  if (previousToken.length === 1) return REGEX_PRECEDERS.has(previousToken);
  return EXPRESSION_KEYWORDS.has(previousToken);
}

// endregion | Helpers
