import {
  type AdoptionSite,
  blankNonCode,
  getLineAtOffset,
  PARENTHESES,
  readBalancedGroup,
} from '@williamthorsen/toolbelt.adoption';

export type EnumIdiomKind = 'values-includes';

// A parenthesis flush against one of these opens an argument list: a callee's name, a call, a subscript, a type
// argument list, or an optional call.
const CALLEE_END = /[\w$).>\]]/;
// Sticky, so a test reads from the offset handed to `startsAt` and searches no further.
const INCLUDES_CALL = /\s*\.\s*includes\s*\(/y;
// A name, or names joined by dots. Code refers to an enum by name, so no other argument is an enum.
const MEMBER_CHAIN = /^\s*[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*$/;
const TYPE_ASSERTION = /\s*as\s+\S/y;
// The lookbehind declines an `Object` reached through another object. A simple type argument is spanned; one
// containing an angle bracket or a parenthesis goes unclaimed.
const VALUES_CALL = /(?<![\w$.])Object\s*\.\s*values\s*(?:<[^<>()]*>\s*)?\(/g;
const WHITESPACE = /\s/;

/**
 * Lists every hand-rolled enum membership test in a source file, which is a search of an enum's values for a
 * candidate value.
 *
 * The source is blanked before the anchor scan reads it, so a test written in a comment or a literal is
 * invisible here. Blanking preserves every offset, so a reported line matches the source.
 *
 * @internal
 */
export function listMembershipSites(source: string): Array<AdoptionSite<EnumIdiomKind>> {
  const code = blankNonCode(source);
  const sites: Array<AdoptionSite<EnumIdiomKind>> = [];

  for (const match of code.matchAll(VALUES_CALL)) {
    const argument = readBalancedGroup(code, match.index + match[0].length - 1, PARENTHESES);
    if (argument === undefined) continue;
    if (!MEMBER_CHAIN.test(code.slice(argument.start + 1, argument.end - 1))) continue;
    if (!isSearchedByIncludes(code, match.index, argument.end)) continue;

    sites.push({ kind: 'values-includes', line: getLineAtOffset(code, match.index) });
  }

  return sites;
}

// region | Helpers

/**
 * Finds the parenthesis opening a group around the anchor, with only whitespace between them, or nothing where the
 * anchor stands outside a group.
 */
function findGroupOpener(code: string, anchor: number): number | undefined {
  let index = anchor - 1;
  while (index >= 0 && WHITESPACE.test(code.charAt(index))) index -= 1;
  if (code.charAt(index) !== '(') return undefined;

  // Treat a parenthesis flush against a callee as an argument list: A formatter spaces a keyword from its group,
  // but never a callee from its arguments.
  if (CALLEE_END.test(code.charAt(index - 1))) return undefined;

  return index;
}

/**
 * Reports whether `includes` searches the values returned by a call, directly or through a type assertion in
 * parentheses around the call.
 */
function isSearchedByIncludes(code: string, anchor: number, valuesEnd: number): boolean {
  if (startsAt(INCLUDES_CALL, code, valuesEnd)) return true;

  const opener = findGroupOpener(code, anchor);
  if (opener === undefined) return false;

  const group = readBalancedGroup(code, opener, PARENTHESES);
  if (group === undefined || !startsAt(TYPE_ASSERTION, code, valuesEnd)) return false;

  return startsAt(INCLUDES_CALL, code, group.end);
}

/** Reports whether a sticky pattern matches at an offset. */
function startsAt(pattern: RegExp, text: string, offset: number): boolean {
  pattern.lastIndex = offset;
  return pattern.test(text);
}

// endregion | Helpers
