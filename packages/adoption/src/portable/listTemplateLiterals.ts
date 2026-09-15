export interface TemplateInterpolation {
  /** One past the interpolation's closing brace. */
  end: number;
  /** The offset of the interpolation's `$`. */
  start: number;
}

export interface TemplateLiteral {
  /** One past the closing backtick. */
  end: number;
  interpolations: TemplateInterpolation[];
  isTagged: boolean;
  /** The opening backtick's offset. */
  start: number;
}

// Words after which a backtick opens an untagged template, since each one takes an expression.
const EXPRESSION_KEYWORDS = new Set([
  'await',
  'case',
  'default',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);
const WORD_CHARACTER = /[\w$]/;

/**
 * Lists every template literal in blanked code, in source order, including templates nested in another's
 * interpolations.
 *
 * Takes the output of `blankNonCode`, which turns a template's text to spaces and leaves its backticks, each
 * `${`, and the interpolated code in place, so a backtick or brace inside a string, a comment, a regex, or a
 * template's own text cannot mislead the walk. A template that never closes is not listed: Past that point the
 * walk no longer knows which text is code.
 *
 * A template is tagged where the code before its backtick ends an expression: an identifier other than an
 * expression keyword, a member name, or a closing parenthesis or bracket, any of them optionally followed by type
 * arguments.
 *
 * @internal
 */
export function listTemplateLiterals(code: string): TemplateLiteral[] {
  const templates: TemplateLiteral[] = [];
  scanCode(0, false);

  return templates.toSorted((a, b) => a.start - b.start);

  // region | Helpers

  /**
   * Walks code from an offset, listing each template that it opens. Returns the offset of the brace closing an
   * interpolation, or the code's length where the code runs out first.
   */
  function scanCode(from: number, isInterpolation: boolean): number {
    let braceDepth = 0;
    let index = from;
    while (index < code.length) {
      const character = code[index];
      if (character === '`') {
        const end = scanTemplate(index);
        if (end === undefined) return code.length;
        index = end;
        continue;
      }
      if (isInterpolation && character === '{') braceDepth += 1;
      if (isInterpolation && character === '}') {
        if (braceDepth === 0) return index;
        braceDepth -= 1;
      }
      index += 1;
    }
    return code.length;
  }

  /**
   * Lists the template opening at an offset. Returns one past its closing backtick, or nothing where none closes it.
   */
  function scanTemplate(start: number): number | undefined {
    const interpolations: TemplateInterpolation[] = [];
    let index = start + 1;
    while (index < code.length) {
      if (code[index] === '`') {
        templates.push({ end: index + 1, interpolations, isTagged: isTagPosition(code, start), start });
        return index + 1;
      }
      if (code[index] === '$' && code[index + 1] === '{') {
        const close = scanCode(index + 2, true);
        if (close === code.length) return undefined;
        interpolations.push({ end: close + 1, start: index });
        index = close + 1;
        continue;
      }
      index += 1;
    }
    return undefined;
  }

  // endregion | Helpers
}

// region | Helpers

/** Returns one past the last non-whitespace character before an offset, or 0 where there is none. */
function findPrecedingCodeEnd(code: string, offset: number): number {
  let end = offset;
  while (end > 0 && /\s/.test(code[end - 1] ?? '')) end -= 1;
  return end;
}

/** Returns the offset of the `<` that a closing `>` balances, or nothing where none does. */
function findTypeArgumentsStart(code: string, close: number): number | undefined {
  let depth = 0;
  for (let index = close; index >= 0; index -= 1) {
    if (code[index] === '>') depth += 1;
    if (code[index] === '<') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

/** Reports whether the code before an offset ends an expression, which makes a backtick there a tag's template. */
function isTagPosition(code: string, offset: number): boolean {
  const end = findPrecedingCodeEnd(code, offset);
  const character = code[end - 1];
  if (character === undefined) return false;
  if (character === ')' || character === ']') return true;
  if (character === '>' && code[end - 2] !== '=') {
    const typeArgumentsStart = findTypeArgumentsStart(code, end - 1);
    return typeArgumentsStart !== undefined && isTagPosition(code, typeArgumentsStart);
  }
  if (!WORD_CHARACTER.test(character)) return false;

  let wordStart = end;
  while (wordStart > 0 && WORD_CHARACTER.test(code[wordStart - 1] ?? '')) wordStart -= 1;
  const isMemberName = code[findPrecedingCodeEnd(code, wordStart) - 1] === '.';
  return isMemberName || !EXPRESSION_KEYWORDS.has(code.slice(wordStart, end));
}

// endregion | Helpers
