import {
  type AdoptionSite,
  blankNonCode,
  BRACES,
  condenseWhitespace,
  getLineAtOffset,
  PARENTHESES,
  readAnchoredWindow,
  readBalancedGroup,
} from '@williamthorsen/toolbelt.adoption';

export type TestingIdiomKind = 'hand-rolled-error-capture';

// A member chain reached directly or through optional chaining. A subscript, a parenthesized callee, and an
// immediately-invoked literal are each declined: the substitution wraps one named call.
const CALLEE = /^[\w$]+(?:\??\.[\w$]+)*$/;
const CALL_PREFIX = /^(?:await )?(?:new )?/;
// The catch clause opens the text past the try block, whose closing brace the group reader has just reported.
const CATCH_CLAUSE = /^\s*catch\s*\(/;
// Whitespace is condensed by the time this reads, so one space is the most that can sit at a joint.
const CAUGHT_ASSIGNMENT = /^(?<target>[\w$]+) ?= ?(?<caught>[\w$]+)(?: as .+)?$/;
const IDENTIFIER = /^[\w$]+$/;
// Far enough to clear an enclosing hook's opening line, which is what separates the declaration from the try
// in the longest site this recognizes. Longer reaches past the block and binds an unrelated declaration.
const LOOKBEHIND_LENGTH = 400;
const TRAILING_SEMICOLON = /;$/;
const TRY_ANCHOR = /\btry\s*\{/g;

/**
 * Lists every hand-rolled error capture in a source file, which is a try/catch whose try block is a single
 * call and whose catch block assigns the caught value to a variable declared outside the try.
 *
 * The source is blanked before the anchor scan reads it, so a try written in a comment or a literal is
 * invisible here. Blanking preserves every offset, so a reported line still names the line held by the source.
 *
 * @internal
 */
export function listCaptureSites(source: string): Array<AdoptionSite<TestingIdiomKind>> {
  const code = blankNonCode(source);
  const sites: Array<AdoptionSite<TestingIdiomKind>> = [];

  for (const match of code.matchAll(TRY_ANCHOR)) {
    const block = readBalancedGroup(code, match.index, BRACES);
    if (block === undefined) continue;

    if (!isSingleCall(condenseWhitespace(code.slice(block.start + 1, block.end - 1)))) continue;

    const target = readCaughtTarget(code.slice(block.end));
    if (target === undefined) continue;

    const { before } = readAnchoredWindow(code, match.index, { lookahead: 0, lookbehind: LOOKBEHIND_LENGTH });
    if (!hasOuterDeclaration(before, target)) continue;

    sites.push({ kind: 'hand-rolled-error-capture', line: getLineAtOffset(code, match.index), symbol: target });
  }

  return sites;
}

// region | Helpers

/** Escapes the one regex metacharacter that an identifier may hold. */
function escapeIdentifier(name: string): string {
  return name.replaceAll('$', String.raw`\$`);
}

/**
 * Reports whether a lookbehind declares a name outside the try block that follows it.
 *
 * `const` is not a spelling of this idiom: a catch block cannot reassign one, so a capture has to declare its
 * variable `let` or `var`. A declaration list naming several variables goes unrecognized, which keeps the
 * window from binding a name that some other statement in it happens to mention.
 */
function hasOuterDeclaration(before: string, name: string): boolean {
  return new RegExp(String.raw`\b(?:let|var) ${escapeIdentifier(name)}\b`).test(before);
}

/**
 * Reports whether a try block holds one call and nothing else.
 *
 * `captureError` takes a thunk and hands back what it threw, discarding what it returned, so a block that
 * keeps a result or runs a second statement is doing something the substitution does not preserve. `await`
 * and `new` are spanned, each being one token ahead of the call rather than work beside it.
 */
function isSingleCall(body: string): boolean {
  const statement = body.trim().replace(TRAILING_SEMICOLON, '').trim().replace(CALL_PREFIX, '');

  const args = readBalancedGroup(statement, 0, PARENTHESES);
  if (args === undefined || args.end !== statement.length) return false;

  return CALLEE.test(statement.slice(0, args.start).trim());
}

/**
 * Returns the variable a catch block assigns its caught value to, or nothing where it assigns none.
 *
 * A catch that logs, rethrows, or branches outlives the substitution, so only a lone assignment of the
 * parameter counts, with a cast admitted because it is how the hand-roll recovers the type it lost. A catch
 * binding no parameter, or destructuring one, has nothing to capture.
 */
function readCaughtTarget(tail: string): string | undefined {
  const clause = CATCH_CLAUSE.exec(tail);
  if (clause === null) return undefined;

  const bound = readBalancedGroup(tail, clause[0].length - 1, PARENTHESES);
  if (bound === undefined) return undefined;

  const parameter =
    tail
      .slice(bound.start + 1, bound.end - 1)
      .split(':', 1)[0]
      ?.trim() ?? '';
  if (!IDENTIFIER.test(parameter)) return undefined;

  const block = readBalancedGroup(tail, bound.end, BRACES);
  if (block === undefined || tail.slice(bound.end, block.start).trim() !== '') return undefined;

  const body = condenseWhitespace(tail.slice(block.start + 1, block.end - 1));
  const assignment = CAUGHT_ASSIGNMENT.exec(body.trim().replace(TRAILING_SEMICOLON, '').trim());

  return assignment?.groups?.['caught'] === parameter ? assignment.groups['target'] : undefined;
}

// endregion | Helpers
