import { BRACES, PARENTHESES, readBalancedGroup } from '@williamthorsen/toolbelt.adoption';

export type ConsoleMockKind = 'console-capture' | 'console-capture-lossy' | 'console-silence' | 'console-unclassified';

interface ImplementationHead {
  /** Everything past the parameter list, from which the body is read. */
  body: string;
  /** The parameter list's interior, without its delimiters. */
  parameters: string;
}

const IMPLEMENTATION = /^\s*\.mockImplementation(?:Once)?\(/;
const BARE_REFERENCE = /^[\w$.]+$/;
const FUNCTION_HEAD = /^(?:async\s+)?function\b/;
const LEADING_ASYNC = /^async\s+/;
const SOLE_PARAMETER = /^([\w$]+)\s*=>/;
const REST_PARAMETER = /(?:^|,)\s*\.\.\./;
const EMPTY_EXPRESSION = /^(?:undefined|void 0)$/;

/**
 * Names what a console mock is doing, from the text following the spy.
 *
 * The text comes from the blanked code produced by `listConsoleSites`, so an implementation written in a comment
 * or a string is not one that the spy carries.
 *
 * A mock that captures nothing is a silence whatever its parameter list names, which is why the empty-body test
 * runs ahead of the parameter test: `(_message) => {}` names a parameter and still loses nothing. Past that, a
 * parameter list naming an argument and no rest parameter is the one defect, because every argument past the
 * last that it names is dropped.
 *
 * `console-unclassified` covers what this could not read: an implementation given as a bare reference, one
 * attached anywhere but the spy's own call chain, one whose delimiters never balance, and a spy carrying no
 * implementation at all.
 *
 * @internal
 */
export function classifyConsoleMock(after: string): ConsoleMockKind {
  if (!IMPLEMENTATION.test(after)) return 'console-unclassified';

  const group = readBalancedGroup(after, 0, PARENTHESES);
  if (group === undefined) return 'console-unclassified';

  const implementation = after.slice(group.start + 1, group.end - 1).trim();
  if (BARE_REFERENCE.test(implementation)) return 'console-unclassified';

  const head = readImplementationHead(implementation);
  if (head === undefined) return 'console-unclassified';

  if (isNoOp(head.body)) return 'console-silence';
  if (REST_PARAMETER.test(head.parameters)) return 'console-capture';
  return head.parameters.trim() === '' ? 'console-capture' : 'console-capture-lossy';
}

// region | Helpers

/**
 * Locates a `function` expression's body past any return-type annotation, whose own braces are not the body's.
 * Telling a type's braces from a block's takes a parser, so an annotation carrying one leaves the body starting
 * inside the type, where `isNoOp` declines it rather than mistaking it for an empty block.
 */
function findBodyPastAnnotation(rest: string): string | undefined {
  if (!rest.trimStart().startsWith(':')) return rest;

  const brace = rest.indexOf('{');
  return brace === -1 ? undefined : rest.slice(brace);
}

/** Locates an arrow's body past its `=>`, which a return-type annotation may sit ahead of. */
function findBodyPastArrow(rest: string): string | undefined {
  const arrow = rest.indexOf('=>');
  return arrow === -1 ? undefined : rest.slice(arrow + 2);
}

/** Reports whether a body does nothing, whether written as an empty block or as an expression discarding it. */
function isNoOp(body: string): boolean {
  const trimmed = body.trim();
  const block = trimmed.startsWith('{') ? readBalancedGroup(trimmed, 0, BRACES) : undefined;

  // A block is the body only where it spans the whole of it. `(key) => cache[key] = {}` ends in a brace group
  // that is an assigned value rather than a body, and reading it as one would call a capture a silence.
  if (block !== undefined && block.end === trimmed.length) return trimmed.slice(1, -1).trim() === '';

  return EMPTY_EXPRESSION.test(trimmed);
}

/**
 * Splits an implementation into its parameter list and what follows, or returns nothing where neither of the
 * three heads that it accepts fits: a parenthesized list, a sole parameter written without parentheses, and a
 * `function` expression.
 */
function readImplementationHead(implementation: string): ImplementationHead | undefined {
  if (FUNCTION_HEAD.test(implementation)) return readParenthesizedHead(implementation, findBodyPastAnnotation);

  const arrow = implementation.replace(LEADING_ASYNC, '');
  if (arrow.startsWith('(')) return readParenthesizedHead(arrow, findBodyPastArrow);

  const sole = SOLE_PARAMETER.exec(arrow);
  return sole?.[1] === undefined ? undefined : { body: arrow.slice(sole[0].length), parameters: sole[1] };
}

/** Reads a head whose parameter list is parenthesized, taking the body from what follows the list. */
function readParenthesizedHead(
  implementation: string,
  findBody: (rest: string) => string | undefined,
): ImplementationHead | undefined {
  const list = readBalancedGroup(implementation, 0, PARENTHESES);
  if (list === undefined) return undefined;

  const body = findBody(implementation.slice(list.end));
  if (body === undefined) return undefined;

  return { body, parameters: implementation.slice(list.start + 1, list.end - 1) };
}

// endregion | Helpers
