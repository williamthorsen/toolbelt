import {
  getLineAtOffset,
  isArraySubscript,
  listTemplateLiterals,
  listTopLevelSpans,
  readAnchoredWindow,
  readLiteral,
  type TemplateLiteral,
  type TextSpan,
} from '@williamthorsen/toolbelt.adoption';

import { findCommonIndent, isBlankText } from '../internal/indent-rules.ts';

interface LeadingText {
  /** Whether the element contains anything but indentation. One containing an interpolation always does. */
  hasContent: boolean;
  text: string;
}

// The array's closing bracket joined by one quoted separator. The separator is blanked in the code, so its text is
// read from the source.
const JOIN_TAIL = /\]\s*\.join\(\s*(?<separator>'[^'\n]*'|"[^"\n]*")\s*\)/dg;
const QUOTED_ELEMENT = /^(?:'[^'\n]*'|"[^"\n]*")$/;
const NEWLINE_ESCAPE = String.raw`\n`;
// Long enough to include the token before a bracket that a formatter has separated from it.
const SUBSCRIPT_LOOKBEHIND = 32;

/**
 * Lists the line of every array of line literals joined with a newline in a source file.
 *
 * Takes both texts: The array is matched on the blanked code, and the text of its separator and elements is read
 * from the source beneath at the same offsets.
 *
 * An array is claimed when it spans more than one line and contains at least two elements, each a string literal or
 * an untagged template literal. Laying out one element per line is the evidence that the array contains a block of
 * text. An array whose non-blank elements share an indent is declined, since `dedent` would strip it, as is one
 * containing any other element, which a template cannot contain as written.
 *
 * @internal
 */
export function listJoinedLineArrayLines(code: string, source: string): number[] {
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
    if (leadingTexts.length < elements.length) continue;

    const contentTexts = leadingTexts.filter((leadingText) => leadingText.hasContent).map(({ text }) => text);
    if (findCommonIndent(contentTexts) !== '') continue;

    lines.push(getLineAtOffset(code, open));
  }

  return lines;
}

// region | Helpers

/** Returns the offset of the bracket that a closing bracket balances, or nothing when none does. */
function findOpeningBracket(code: string, close: number): number | undefined {
  let depth = 0;
  for (let index = close; index >= 0; index -= 1) {
    if (code[index] === ']') depth += 1;
    if (code[index] !== '[') {
      continue;
    }

    depth -= 1;
    if (depth === 0) return index;
  }
  return undefined;
}

/**
 * Lists the trimmed span of each element between an array's brackets, ignoring the empty span after a trailing
 * comma. Returns nothing if an element is empty, as in a sparse array.
 */
function listElementSpans(code: string, open: number, close: number): TextSpan[] | undefined {
  const spans = listTopLevelSpans(code, open + 1, close).map(({ end, start }) => trimSpan(code, start, end));
  return spans.some((span) => span.start === span.end) ? undefined : spans;
}

/**
 * Returns the text with which an element opens -- a string literal's content, or a template's text ahead of its
 * first interpolation -- or nothing when the element is neither.
 */
function readLeadingText(
  code: string,
  source: string,
  element: TextSpan,
  templates: readonly TemplateLiteral[],
): LeadingText | undefined {
  if (QUOTED_ELEMENT.test(code.slice(element.start, element.end))) {
    const text = readLiteral(source, [element.start, element.end]) ?? '';
    return { hasContent: !isBlankText(text), text };
  }

  const template = templates.find((candidate) => candidate.start === element.start && candidate.end === element.end);
  if (template === undefined || template.isTagged) return undefined;

  const text = source.slice(template.start + 1, template.interpolations[0]?.start ?? template.end - 1);
  return { hasContent: template.interpolations.length > 0 || !isBlankText(text), text };
}

/** Narrows a span to exclude the whitespace at either end. */
function trimSpan(code: string, start: number, end: number): TextSpan {
  let trimmedStart = start;
  let trimmedEnd = end;
  while (trimmedStart < trimmedEnd && /\s/.test(code[trimmedStart] ?? '')) trimmedStart += 1;
  while (trimmedEnd > trimmedStart && /\s/.test(code[trimmedEnd - 1] ?? '')) trimmedEnd -= 1;
  return { end: trimmedEnd, start: trimmedStart };
}

// endregion | Helpers
