import { BRACES, PARENTHESES, readBalancedGroup, readFunctionLiteral } from '@williamthorsen/toolbelt.adoption';

export type ConsoleMockKind = 'console-capture' | 'console-capture-lossy' | 'console-silence' | 'console-unclassified';

const IMPLEMENTATION = /^\s*\.mockImplementation(?:Once)?\(/;
const BARE_REFERENCE = /^[\w$.]+$/;
const LEADING_ASYNC = /^async\s+/;
const REST_PARAMETER = /(?:^|,)\s*\.\.\./;
const EMPTY_EXPRESSION = /^(?:undefined|void 0)$/;

/**
 * Names what a console mock is doing, from the text following the spy.
 *
 * The text comes from the blanked code produced by `listConsoleSites`, so an implementation written in a comment
 * or a string is not one that the spy has.
 *
 * A mock that captures nothing is a silence whatever its parameter list names, which is why the empty-body test
 * runs ahead of the parameter test: `(_message) => {}` names a parameter and still loses nothing. Past that, a
 * parameter list naming an argument and no rest parameter is the one defect, because every argument past the
 * last that it names is dropped.
 *
 * `console-unclassified` covers what this could not read: an implementation given as a bare reference, one
 * attached anywhere but the spy's own call chain, one whose delimiters never balance, and a spy with no
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

  const head = readFunctionLiteral(implementation.replace(LEADING_ASYNC, ''));
  if (head === undefined) return 'console-unclassified';

  if (isNoOp(head.body)) return 'console-silence';
  if (REST_PARAMETER.test(head.parameters)) return 'console-capture';
  return head.parameters.trim() === '' ? 'console-capture' : 'console-capture-lossy';
}

// region | Helpers

/** Reports whether a body does nothing, whether written as an empty block or as an expression discarding it. */
function isNoOp(body: string): boolean {
  const trimmed = body.trim();
  const block = trimmed.startsWith('{') ? readBalancedGroup(trimmed, 0, BRACES) : undefined;

  // A block is the body only when it spans the whole of it. `(key) => cache[key] = {}` ends in a brace group
  // that is an assigned value rather than a body, and reading it as one would call a capture a silence.
  if (block !== undefined && block.end === trimmed.length) return trimmed.slice(1, -1).trim() === '';

  return EMPTY_EXPRESSION.test(trimmed);
}

// endregion | Helpers
