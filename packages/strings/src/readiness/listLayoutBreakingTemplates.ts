import { getLineAtOffset, listTemplateLiterals, type TemplateLiteral } from '@williamthorsen/toolbelt.adoption';

const BLANK_LINE = /^[\t ]*\r?$/;
const INDENT = /^[\t ]*/;
// Vitest writes and re-indents an inline snapshot itself, so its layout is not the author's to fix.
const INLINE_SNAPSHOT_CALL = /InlineSnapshot\(\s*$/;
// Long enough to hold the matcher's name ahead of the backtick.
const INLINE_SNAPSHOT_LOOKBEHIND = 64;

/**
 * Lists the line of every untagged template literal whose text drops below the indentation of the line on which it
 * opens, the layout that an author settles for to keep source indentation out of a string.
 *
 * Takes both texts: Templates are located on the blanked code, and the indentation of their lines is read from the
 * source beneath at the same offsets.
 *
 * A template is claimed where it opens on an indented line and the lines after that line, among those holding
 * content, share an indent that does not begin with the opening line's. That covers text written at column 0 inside
 * indented code, and indentation written in tabs beneath a line indented with spaces or the reverse. A line holding
 * only the closing backtick holds no content, and a line that begins inside an interpolation is code rather than
 * text, so neither is measured.
 *
 * @internal
 */
export function listLayoutBreakingTemplates(code: string, source: string): number[] {
  const lines: number[] = [];

  for (const template of listTemplateLiterals(code)) {
    if (template.isTagged || isInlineSnapshotArgument(code, template.start)) continue;

    const openingIndent = INDENT.exec(source.slice(findLineStart(source, template.start)))?.[0] ?? '';
    if (openingIndent === '') continue;

    const laterIndents = listLaterLineIndents(source, template);
    if (laterIndents.length === 0 || findCommonIndent(laterIndents).startsWith(openingIndent)) continue;

    lines.push(getLineAtOffset(code, template.start));
  }

  return lines;
}

// region | Helpers

/** Returns the longest indent with which every indent begins. */
function findCommonIndent(indents: readonly string[]): string {
  const [first = ''] = indents;
  let length = first.length;
  for (const indent of indents) {
    while (length > 0 && !indent.startsWith(first.slice(0, length))) length -= 1;
  }
  return first.slice(0, length);
}

/** Returns the offset at which the line holding an offset begins. */
function findLineStart(source: string, offset: number): number {
  return source.lastIndexOf('\n', offset - 1) + 1;
}

/** Reports whether a template is the argument of a Vitest inline-snapshot matcher. */
function isInlineSnapshotArgument(code: string, start: number): boolean {
  return INLINE_SNAPSHOT_CALL.test(code.slice(Math.max(0, start - INLINE_SNAPSHOT_LOOKBEHIND), start));
}

/**
 * Lists the indent of each line after a template's opening line that holds template text with content, skipping a
 * line that begins inside an interpolation.
 */
function listLaterLineIndents(source: string, template: TemplateLiteral): string[] {
  const indents: string[] = [];
  const textEnd = template.end - 1;

  let newline = source.indexOf('\n', template.start);
  while (newline !== -1 && newline < textEnd) {
    const lineStart = newline + 1;
    const nextNewline = source.indexOf('\n', lineStart);
    const lineText = source.slice(lineStart, nextNewline === -1 || nextNewline > textEnd ? textEnd : nextNewline);
    const isInsideInterpolation = template.interpolations.some(
      (interpolation) => interpolation.start < lineStart && lineStart < interpolation.end,
    );

    if (!isInsideInterpolation && !BLANK_LINE.test(lineText)) indents.push(INDENT.exec(lineText)?.[0] ?? '');
    newline = nextNewline;
  }

  return indents;
}

// endregion | Helpers
