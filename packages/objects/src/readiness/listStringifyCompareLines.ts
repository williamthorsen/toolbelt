import { getLineAtOffset, PARENTHESES, readBalancedGroup } from '@williamthorsen/toolbelt.adoption';

const STRINGIFY_CALL = /(?<![\w$.])JSON\s*\.\s*stringify\s*\(/g;
// What must follow the first call's argument list. Sticky, so it anchors at the offset reported by the
// balanced read rather than scanning forward from it. Loose equality counts: both operands are strings, so it
// answers exactly what the strict test answers, and it is the same defect.
const COMPARED_TO_STRINGIFY = /\s*[!=]==?\s*JSON\s*\.\s*stringify\s*\(/y;

/**
 * Lists the line of every equality test between two `JSON.stringify` calls in a source file.
 *
 * Takes the blanked code produced by `listObjectIdioms`, so a comparison written in a comment or a literal is not
 * one.
 *
 * The argument list is read as a balanced group rather than matched, because an argument may carry
 * parentheses of its own. Both equality operators count, strict and loose alike. A call compared against
 * anything else is serializing rather than comparing, and is not claimed.
 *
 * @internal
 */
export function listStringifyCompareLines(source: string): number[] {
  const lines: number[] = [];

  for (const match of source.matchAll(STRINGIFY_CALL)) {
    const argumentList = readBalancedGroup(source, match.index, PARENTHESES);
    if (argumentList === undefined) continue;

    COMPARED_TO_STRINGIFY.lastIndex = argumentList.end;
    if (!COMPARED_TO_STRINGIFY.test(source)) continue;

    lines.push(getLineAtOffset(source, match.index));
  }

  return lines;
}
