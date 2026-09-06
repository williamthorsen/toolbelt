import {
  type AdoptionSite,
  blankNonCode,
  condenseWhitespace,
  getLineAtOffset,
  PARENTHESES,
  readBalancedGroup,
} from '@williamthorsen/toolbelt.adoption';

import { readExecutor } from './readExecutor.ts';

export type AsyncIdiomKind = 'hand-rolled-sleep';

const CLOSERS = ')]}';
const OPENERS = '([{';
// Digits are left out: a body is claimed for holding nothing but the timer call, so what remains beside it has
// to read as empty, and a literal delay sits inside that call rather than beside it.
const IDENTIFIER_CHARACTER = /[A-Za-z_$]/;
// A simple type argument is spanned, so the group that is read is the executor's own parameter list. One
// holding a parenthesis, as a nested generic or a function type would, goes unclaimed; a sleep resolves `void`.
const PROMISE_CONSTRUCTION = /\bnew\s+Promise\s*(?:<[^<>()]*>\s*)?\(/g;
const RETURN_KEYWORD = /\breturn\b/g;
// Whitespace is condensed by the time this reads, so one space is the most that can sit at the joint.
const TIMEOUT_CALL = /\bsetTimeout\s?\(/;

/**
 * Lists every hand-rolled sleep in a source file, which is a promise whose executor sets a timer and does
 * nothing else.
 *
 * The source is blanked before the anchor scan reads it, so a construction written in a comment or a literal is
 * invisible here. Blanking preserves every offset, so a reported line still names the line held by the source.
 *
 * @internal
 */
export function listSleepSites(source: string): Array<AdoptionSite<AsyncIdiomKind>> {
  const code = blankNonCode(source);
  const sites: Array<AdoptionSite<AsyncIdiomKind>> = [];

  for (const match of code.matchAll(PROMISE_CONSTRUCTION)) {
    const group = readBalancedGroup(code, match.index + match[0].length - 1, PARENTHESES);
    if (group === undefined) continue;

    const argument = condenseWhitespace(code.slice(group.start + 1, group.end - 1));
    if (!isSleepExecutor(argument)) continue;

    sites.push({ kind: 'hand-rolled-sleep', line: getLineAtOffset(code, match.index) });
  }

  return sites;
}

// region | Helpers

/** Reports whether a timer call's arguments are a bare delay that settles the executor's promise. */
function isSleepArguments(argumentsText: string, parameter: string): boolean {
  const args = splitTopLevelArguments(argumentsText);
  // A third argument settles the promise with a value, where `delay` settles with none.
  if (args.length !== 2) return false;

  return resolvesParameter(args[0] ?? '', parameter);
}

/**
 * Reports whether a promise executor sleeps and does nothing else.
 *
 * The body is claimed for what it does not hold: Strip the timer call and a `return`, and a residue carrying no
 * identifier proves the executor set the timer alone. That admits the concise arrow, the braced body, and the
 * `function` form together, and declines an executor that also assigns or reports.
 */
function isSleepExecutor(argument: string): boolean {
  const executor = readExecutor(argument);
  if (executor === undefined || executor.parameter === '') return false;

  const call = TIMEOUT_CALL.exec(executor.body);
  if (call === null) return false;

  const group = readBalancedGroup(executor.body, call.index, PARENTHESES);
  if (group === undefined) return false;

  const residue = executor.body.slice(0, call.index) + executor.body.slice(group.end);
  if (IDENTIFIER_CHARACTER.test(residue.replaceAll(RETURN_KEYWORD, ''))) return false;

  return isSleepArguments(executor.body.slice(group.start + 1, group.end - 1), executor.parameter);
}

/**
 * Reports whether a timer callback settles the promise and does nothing else.
 *
 * The bare parameter is that callback in its plainest spelling, and a function taking nothing and calling the
 * parameter is the same sleep spelled longer. A callback taking a parameter of its own, or doing anything
 * beside the call, is neither: The first receives something, and the second outlives the substitution.
 */
function resolvesParameter(text: string, parameter: string): boolean {
  const trimmed = text.trim();
  if (trimmed === parameter) return true;

  const callback = readExecutor(trimmed);
  if (callback === undefined || callback.parameter !== '') return false;

  const body = callback.body.replaceAll(/[\s;]/g, '');

  return body === `${parameter}()` || body === `return${parameter}()`;
}

/** Splits a call's arguments at the commas that sit outside every bracket. */
function splitTopLevelArguments(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);

    if (OPENERS.includes(character)) depth += 1;
    else if (CLOSERS.includes(character)) depth -= 1;
    else if (character === ',' && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));

  return parts;
}

// endregion | Helpers
