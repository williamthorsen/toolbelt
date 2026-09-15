import {
  getLineAtOffset,
  isArraySubscript,
  listTemplateLiterals,
  readAnchoredWindow,
  readLiteral,
  type TemplateLiteral,
} from '@williamthorsen/toolbelt.adoption';

interface ElementSpan {
  end: number;
  start: number;
}

interface LeadingText {
  /** Whether the element holds anything but indentation. One holding an interpolation always does. */
  hasContent: boolean;
  text: string;
}

// The array's closing bracket joined by one quoted separator. The separator is blanked in the code, so what it holds
// is read from the source.
const JOIN_TAIL = /\]\s*\.join\(\s*(?<separator>'[^'\n]*'|"[^"\n]*")\s*\)/dg;
const BLANK_TEXT = /^[\t ]*$/;
const CLOSING_DELIMITERS = new Set([')', ']', '}']);
const INDENT = /^[\t ]*/;
const QUOTED_ELEMENT = /^(?:'[^'\n]*'|"[^"\n]*")$/;
const NEWLINE_ESCAPE = String.raw`\n`;
const OPENING_DELIMITERS = new Set(['(', '[', '{']);
// Long enough to hold the token before a bracket that a formatter has separated from it.
const SUBSCRIPT_LOOKBEHIND = 32;

/**
 * Lists the line of every array of line literals joined with a newline in a source file.
 *
 * Takes both texts: The array is matched on the blanked code, and what its separator and elements hold is read
 * from the source beneath at the same offsets.
 *
 * An array is claimed where it spans more than one line and holds at least two elements, each a string literal or
 * an untagged template literal. Laying out one element per line is the evidence that the array holds a block of
 * text. An array whose non-blank elements share an indent is declined, since `dedent` would strip it, as is one
 * holding any other element, which a template cannot hold as written.
 *
 * @internal
 */
export function listJoinedLineArrays(code: string, source: string): number[] {
  const templates = listTemplateLiterals(code);
  const lines: number[] = [];

  for (const match of code.matchAll(JOIN_TAIL)) {
    if (readLiteral(source, match.indices?.groups?.['separator']) !== NEWLINE_ESCAPE) continue;

    const close = match.index;
    const open = findOpeningBracket(code, close);
    if (open === undefined || getLineAtOffset(code, open) === getLineAtOffset(code, close)) continue;
    if (
      isArraySubscript(readAnchoredWindow(code, open + 1, { lookahead: 0, lookbehind: SUBSCRIPT_LOOKBEHIND }).before)
    ) {
      continue;
    }

    const elements = listElementSpans(code, open, close);
    if (elements === undefined || elements.length < 2) continue;

    const leadingTexts: LeadingText[] = [];
    for (const element of elements) {
      const leadingText = readLeadingText(code, source, element, templates);
      if (leadingText === undefined) break;
      leadingTexts.push(leadingText);
    }
    if (leadingTexts.length < elements.length || findSharedIndent(leadingTexts) !== '') continue;

    lines.push(getLineAtOffset(code, open));
  }

  return lines;
}

// region | Helpers

/** Returns the offset of the bracket that a closing bracket balances, or nothing where none does. */
function findOpeningBracket(code: string, close: number): number | undefined {
  let depth = 0;
  for (let index = close; index >= 0; index -= 1) {
    if (code[index] === ']') depth += 1;
    if (code[index] === '[') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

/** Returns the indent shared by every element holding content, or an empty string where they share none. */
function findSharedIndent(leadingTexts: readonly LeadingText[]): string {
  const indents = leadingTexts
    .filter((leadingText) => leadingText.hasContent)
    .map((leadingText) => INDENT.exec(leadingText.text)?.[0] ?? '');
  const [first = ''] = indents;

  let length = first.length;
  for (const indent of indents) {
    while (length > 0 && !indent.startsWith(first.slice(0, length))) length -= 1;
  }
  return first.slice(0, length);
}

/**
 * Lists the trimmed span of each element between an array's brackets, ignoring the empty span after a trailing
 * comma. Returns nothing where an element is empty, as in a sparse array.
 */
function listElementSpans(code: string, open: number, close: number): ElementSpan[] | undefined {
  const spans: ElementSpan[] = [];
  let depth = 0;
  let start = open + 1;

  for (let index = open + 1; index <= close; index += 1) {
    const character = code.charAt(index);
    if (OPENING_DELIMITERS.has(character)) depth += 1;
    else if (index < close && CLOSING_DELIMITERS.has(character)) depth -= 1;
    else if ((character === ',' && depth === 0) || index === close) {
      spans.push(trimSpan(code, start, index));
      start = index + 1;
    }
  }

  const last = spans.at(-1);
  if (last !== undefined && last.start === last.end) spans.pop();
  return spans.some((span) => span.start === span.end) ? undefined : spans;
}

/**
 * Returns the text with which an element opens -- a string literal's content, or a template's text ahead of its
 * first interpolation -- or nothing where the element is neither.
 */
function readLeadingText(
  code: string,
  source: string,
  element: ElementSpan,
  templates: readonly TemplateLiteral[],
): LeadingText | undefined {
  if (QUOTED_ELEMENT.test(code.slice(element.start, element.end))) {
    const text = readLiteral(source, [element.start, element.end]) ?? '';
    return { hasContent: !BLANK_TEXT.test(text), text };
  }

  const template = templates.find((candidate) => candidate.start === element.start && candidate.end === element.end);
  if (template === undefined || template.isTagged) return undefined;

  const text = source.slice(template.start + 1, template.interpolations[0]?.start ?? template.end - 1);
  return { hasContent: template.interpolations.length > 0 || !BLANK_TEXT.test(text), text };
}

/** Narrows a span to exclude the whitespace at either end. */
function trimSpan(code: string, start: number, end: number): ElementSpan {
  let trimmedStart = start;
  let trimmedEnd = end;
  while (trimmedStart < trimmedEnd && /\s/.test(code[trimmedStart] ?? '')) trimmedStart += 1;
  while (trimmedEnd > trimmedStart && /\s/.test(code[trimmedEnd - 1] ?? '')) trimmedEnd -= 1;
  return { end: trimmedEnd, start: trimmedStart };
}

// endregion | Helpers
