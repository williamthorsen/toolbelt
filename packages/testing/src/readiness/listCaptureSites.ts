import {
  type AdoptionSite,
  blankNonCode,
  BRACES,
  condenseWhitespace,
  type Delimiters,
  getLineAtOffset,
  PARENTHESES,
  readAnchoredWindow,
  readBalancedGroup,
} from '@williamthorsen/toolbelt.adoption';

export type TestingIdiomKind = 'hand-rolled-error-capture';

/** A catch block's assignment of its caught value, located in the text past the try block. */
interface CatchCapture {
  /** One past the catch block's closing brace. */
  end: number;
  target: string;
}

const BRACKETS: Delimiters = { close: ']', open: '[' };
// A member chain reached directly or through optional chaining, optionally called optionally, and optionally
// given type arguments. A type argument holding a parenthesis, as a function type would, goes unspanned. A
// subscript, a parenthesized callee, and an immediately-invoked literal are each declined: the substitution
// wraps one named call.
const CALLEE = /^[\w$]+(?:\??\.[\w$]+)*(?:\?\.)?(?:<[^<>()]*>)?$/;
const CALL_PREFIX = /^(?:await )?(?:new )?/;
// The catch clause opens the text past the try block, whose closing brace the group reader has just reported.
const CATCH_CLAUSE = /^\s*catch\s*\(/;
const FINALLY_CLAUSE = /^\s*finally\b/;
// Whitespace is condensed by the time this reads, so one space is the most that can sit at a joint.
const CAUGHT_ASSIGNMENT = /^(?<target>[\w$]+) ?= ?(?<caught>[\w$]+)(?: as .+)?$/;
const IDENTIFIER = /^[\w$]+$/;
// What may follow a literal for the literal to be the whole of an assertion's argument or a declaration's
// initializer. A cast changes no runtime value.
const LITERAL_ARGUMENT_TAIL = /^(?: as .+)?$/;
const LITERAL_INITIALIZER_TAIL = /^ ?(?: as [^;]+)?;/;
// Far enough to clear an enclosing hook's opening line, which is what separates the declaration from the try
// in the longest site this recognizes. Longer reaches past the block and binds an unrelated declaration.
const LOOKBEHIND_LENGTH = 400;
const SCALAR_LITERAL = /^(?:-?\.?\d(?:[eE][+-]|[\w.])*|(?:false|null|true|undefined)(?![\w$]))/;
const STRING_DELIMITERS = new Set(['"', "'", '`']);
const TRAILING_COMMA = /,$/;
const TRAILING_SEMICOLON = /;$/;
const TRY_ANCHOR = /\btry\s*\{/g;

/**
 * Lists every hand-rolled error capture in a source file, which is a try/catch whose try block is a single
 * call and whose catch block assigns the caught value to a variable declared outside the try.
 *
 * A capture whose enclosing block asserts the captured value `toBe` a literal, before anything reassigns the
 * variable, is not reported: the call threw something other than an `Error`, on which `captureError` fails the
 * test.
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

    const capture = readCatchCapture(code.slice(block.end));
    if (capture === undefined) continue;

    const { before } = readAnchoredWindow(code, match.index, { lookahead: 0, lookbehind: LOOKBEHIND_LENGTH });
    if (!hasOuterDeclaration(before, capture.target)) continue;

    const catchEnd = block.end + capture.end;
    const blockRest = code.slice(catchEnd, findEnclosingBlockEnd(code, catchEnd) ?? code.length);
    const captureRest = blockRest.slice(0, findReassignmentStart(blockRest, capture.target));
    if (hasNonErrorLiteralAssertion(condenseWhitespace(captureRest), capture.target, before)) continue;

    sites.push({
      kind: 'hand-rolled-error-capture',
      line: getLineAtOffset(code, match.index),
      symbol: capture.target,
    });
  }

  return sites;
}

// region | Helpers

/** Escapes the one regex metacharacter that an identifier may hold. */
function escapeIdentifier(name: string): string {
  return name.replaceAll('$', String.raw`\$`);
}

/**
 * Returns the offset of the closing brace of the block that encloses an offset, or nothing where no block
 * encloses it.
 */
function findEnclosingBlockEnd(code: string, from: number): number | undefined {
  let depth = 0;
  for (let index = from; index < code.length; index += 1) {
    if (code[index] === '{') depth += 1;
    else if (code[index] === '}') {
      if (depth === 0) return index;
      depth -= 1;
    }
  }

  return undefined;
}

/**
 * Returns the offset past the literal that opens a text, or nothing where the text opens with no literal.
 *
 * A string arrives blanked with its delimiters kept, so the next delimiter of its kind closes it.
 */
function findLiteralEnd(text: string): number | undefined {
  const opener = text[0];
  if (opener === '{') return readBalancedGroup(text, 0, BRACES)?.end;
  if (opener === '[') return readBalancedGroup(text, 0, BRACKETS)?.end;

  if (opener !== undefined && STRING_DELIMITERS.has(opener)) {
    const close = text.indexOf(opener, 1);
    return close === -1 ? undefined : close + 1;
  }

  return SCALAR_LITERAL.exec(text)?.[0].length;
}

/**
 * Returns the offset at which a text first assigns a name, or nothing where it never assigns one.
 *
 * An assertion past that offset reads whatever the assignment stored rather than the captured value.
 */
function findReassignmentStart(text: string, name: string): number | undefined {
  return new RegExp(String.raw`(?<![\w$.])${escapeIdentifier(name)}\s*=(?![=>])`).exec(text)?.index;
}

/**
 * Reports whether the text past a capture asserts the captured value `toBe` a literal, written inline or
 * through a `const` that the lookbehind declares.
 *
 * `toBe` alone compares identity, so its pass shows that the value thrown is the literal itself.
 */
function hasNonErrorLiteralAssertion(blockRest: string, target: string, before: string): boolean {
  const assertion = new RegExp(String.raw`\bexpect\( ?${escapeIdentifier(target)} ?\) ?\.toBe\(`, 'g');

  for (const match of blockRest.matchAll(assertion)) {
    const args = readBalancedGroup(blockRest, match.index + match[0].length - 1, PARENTHESES);
    if (args === undefined) continue;

    const expected = blockRest
      .slice(args.start + 1, args.end - 1)
      .trim()
      .replace(TRAILING_COMMA, '')
      .trim();
    if (isNonErrorLiteral(expected) || isBoundToNonErrorLiteral(before, expected)) return true;
  }

  return false;
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
 * Reports whether the nearest `const` declaring a name in a lookbehind initializes it to a literal.
 *
 * Only a `const` is read, since an assignment between a `let` and the try could replace its literal.
 */
function isBoundToNonErrorLiteral(before: string, name: string): boolean {
  if (!IDENTIFIER.test(name)) return false;

  const declaration = new RegExp(String.raw`\bconst ${escapeIdentifier(name)}(?: ?:[^=;]*)? ?= ?`, 'g');
  const nearest = before.matchAll(declaration).toArray().at(-1);
  if (nearest === undefined) return false;

  const initializer = before.slice(nearest.index + nearest[0].length);
  const end = findLiteralEnd(initializer);
  return end !== undefined && LITERAL_INITIALIZER_TAIL.test(initializer.slice(end));
}

/**
 * Reports whether an expression is a literal and nothing else, which no `Error` can be.
 *
 * A literal opening a longer expression does not count, since `null ?? fallback` evaluates to the fallback.
 */
function isNonErrorLiteral(expression: string): boolean {
  const end = findLiteralEnd(expression);
  return end !== undefined && LITERAL_ARGUMENT_TAIL.test(expression.slice(end));
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
 * Returns the variable a catch block assigns its caught value to, with the offset past the block, or nothing
 * where it assigns none.
 *
 * A catch that logs, rethrows, or branches outlives the substitution, so only a lone assignment of the
 * parameter counts, with a cast admitted because it is how the hand-roll recovers the type it lost. A catch
 * binding no parameter, or destructuring one, has nothing to capture.
 *
 * A `finally` clause disqualifies the site. `captureError` throws where the call completes normally, so the
 * substituted form skips whatever the clause holds on that path, and in a test that is a restore that stops
 * happening. One import has to replace the whole of a site for it to be claimed.
 */
function readCatchCapture(tail: string): CatchCapture | undefined {
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
  if (FINALLY_CLAUSE.test(tail.slice(block.end))) return undefined;

  const body = condenseWhitespace(tail.slice(block.start + 1, block.end - 1));
  const assignment = CAUGHT_ASSIGNMENT.exec(body.trim().replace(TRAILING_SEMICOLON, '').trim());

  const target = assignment?.groups?.['target'];
  if (target === undefined || assignment?.groups?.['caught'] !== parameter) return undefined;

  return { end: block.end, target };
}

// endregion | Helpers
