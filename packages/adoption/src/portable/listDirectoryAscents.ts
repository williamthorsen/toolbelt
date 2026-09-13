import { getLineAtOffset } from 'readyup/check-utils';

import { readAnchoredWindow } from './readAnchoredWindow.ts';
import { BRACES, PARENTHESES, readBalancedGroup } from './readBalancedGroup.ts';
import { readLiteral } from './readLiteral.ts';

export interface DirectoryAscent {
  /** The line on which the innermost loop performing the ascent opens. */
  line: number;
  /** The names that the loop probes each level for, or `undefined` where it probes none. */
  probedNames: readonly string[] | undefined;
}

// The binding that an assignment opening at the anchor assigns to, read off the condensed lookbehind. A
// comparison and a compound assignment each put a character between the name and the `=`, so neither reads as one.
const ASSIGNED_TARGET = /(?<target>[A-Za-z_$][\w$]*) ?= ?$/;
// Only the lookbehind is read, and only far enough to see the binding that takes the ascent.
const ASSIGNMENT_WINDOW = { lookahead: 0, lookbehind: 80 };
// The brackets that hold a comma inside one expression: a call's, an array's, an object's, and an interpolation's.
const BRACKET_CLOSERS = new Set([')', ']', '}']);
const BRACKET_OPENERS = new Set(['(', '[', '{']);
// A declaration assigning a value, matched through its `=` so that the value opens at the end of the match.
const DECLARATION = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*(?::[^=;\n]*)?=(?![=>])/g;
// A declaration of a name, whether or not it assigns a value.
const DECLARED_NAME = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)/g;
// `dirname` called on a bare binding, through any receiver or none, so `path.dirname`, an aliased import, and a
// destructured import all match. The assignment-back rule carries the precision, so the anchor need not.
const DIRNAME_ASCENT = /(?:[A-Za-z_$][\w$]*\s*\.\s*)?\bdirname\s*\(\s*(?<subject>[A-Za-z_$][\w$]*)\s*\)/g;
const LEADING_SEPARATOR = /^[/\\]+/;
// The reads by which a walk asks what a level holds, in their synchronous and their promise spelling alike. Each
// takes the path that it reads as its first argument.
const LEVEL_PROBE = /\b(?:access|exists|lstat|readdir|readFile|stat)(?:Sync)?\s*\(/g;
const LOOP_KEYWORD = /\b(?<keyword>do|for|while)\b/g;
// A quoted literal, the backtick opening a template, or a name read as a value, which leaves out the name of a member.
const PATH_TOKEN = /(?<quoted>(?<quote>['"])[^'"]*\k<quote>)|`|(?<![\w$.])(?<name>[A-Za-z_$][\w$]*)/g;
// An assignment, simple or compound, to a name that no declaration keyword introduces.
const REASSIGNMENT =
  /(?<![\w$.])(?<!\b(?:const|let|var)\s+)(?<name>[A-Za-z_$][\w$]*)\s*(?:\*\*|<<|>>>?|&&|\|\||\?\?|[-+*/%&|^])?=(?![=>])/g;
const SEPARATOR_RUN = /[/\\]+/g;
// One bare binding assigned to another and nothing else, which is the step carrying an ascent back to the binding
// that it ascends.
const SIMPLE_ASSIGNMENT = /(?<![\w$])(?<target>[A-Za-z_$][\w$]*)\s*=(?!=)\s*(?<value>[A-Za-z_$][\w$]*)(?![\w$.([])/g;
// A `const` holding one string literal and nothing else. Blanking keeps a template's `${`, so a template holding
// an interpolation does not match.
const STRING_CONSTANT =
  /\bconst\s+(?<name>[A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*(?<literal>(?<quote>['"`])[^'"`$]*\k<quote>)\s*(?:as\s+const\s*)?(?=[;,)\n]|$)/dg;
const WHITESPACE = /\s/;

interface BindingAssignment {
  target: string;
  value: string;
}

interface Loop {
  /** One past the body's closing brace. */
  end: number;
  /** The loop keyword's own offset. */
  start: number;
}

interface LoopAscent {
  loop: Loop;
  probedNames: string[] | undefined;
}

interface LoopBinding {
  name: string;
  /** The parts of the value that the declaration assigns, with each binding and constant in them expanded. */
  parts: readonly PathPart[];
}

/** A name that a path reads as a value, or the text of a literal that it holds. */
type PathPart = { kind: 'read'; name: string } | { kind: 'text'; text: string };

interface PathScope {
  bindings: readonly LoopBinding[];
  constants: readonly StringConstant[];
}

interface StringConstant {
  name: string;
  value: string;
}

interface TemplateParts {
  /** One past the closing backtick. */
  end: number;
  parts: PathPart[];
}

/**
 * Lists every loop in a source that ascends the directory chain by `dirname`, with the names that it probes each
 * level for.
 *
 * Takes code blanked by `blankNonCode` and the source beneath it, so an ascent written in a comment or a literal is
 * not one while a probed name stays readable. Blanking preserves every offset, so a reported line still names the
 * line held by the source.
 *
 * Each ascent is reported once, on the innermost loop around it, so detectors that divide the walks between them
 * partition one set.
 *
 * The scanner under-matches on purpose. A recursive walk-up function is no loop and goes unreported, as does an
 * ascent written as `resolve(dir, '..')` and a loop whose body is a single unbraced statement.
 *
 * A probe's path is read through a binding that the loop declares once with a value and never reassigns, and through
 * a `const` that holds a string literal and is the source's only declaration of its name, as though each value were
 * written in place. A name read past the ascended binding that neither resolves, such as `name` in
 * `${dir}/node_modules/${name}/package.json`, contributes no probed name, because a name read from the literals
 * alone would name a different path. A constant imported from another module or declared more than once is such a
 * name. A path reaching the level through a binding declared outside the loop or assigned more than once in it is
 * no probe, and neither is a call to a helper that probes.
 *
 * @internal
 */
export function listDirectoryAscents(code: string, source: string): DirectoryAscent[] {
  const constants = listStringConstants(code, source);
  const ascents = listLoops(code).flatMap((loop) => describeAscent(code, source, loop, constants) ?? []);

  // Every loop around an ascent holds it, and the innermost of them is the one whose head names the site.
  return ascents
    .filter((ascent) => ascents.every((other) => other === ascent || !isNested(other.loop, ascent.loop)))
    .map((ascent) => ({ line: getLineAtOffset(code, ascent.loop.start), probedNames: ascent.probedNames }));
}

// region | Helpers

/** Counts the matches of a pattern by the name that each captures. */
function countMatchesByName(text: string, pattern: RegExp): Map<string, number> {
  const counts = new Map<string, number>();

  for (const match of text.matchAll(pattern)) {
    const name = match.groups?.['name'];
    if (name !== undefined) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return counts;
}

/** Describes the ascent that a loop performs, or nothing where it performs none. */
function describeAscent(
  code: string,
  source: string,
  loop: Loop,
  constants: readonly StringConstant[],
): LoopAscent | undefined {
  const subject = findAscendedBinding(code.slice(loop.start, loop.end));
  if (subject === undefined) return undefined;

  const scope: PathScope = { bindings: listLoopBindings(code, source, loop, subject, constants), constants };

  return { loop, probedNames: listProbedNames(code, source, loop, subject, scope) };
}

/**
 * Replaces each read of a loop binding with the expanded parts of its value, and each read of a string constant
 * with its text. A read of the ascended binding stays a read.
 */
function expandPathParts(parts: readonly PathPart[], scope: PathScope, subject: string): PathPart[] {
  return parts.flatMap((part): readonly PathPart[] => {
    if (part.kind === 'text' || part.name === subject) return [part];

    const constant = scope.constants.find((candidate) => candidate.name === part.name);
    if (constant !== undefined) return [{ kind: 'text', text: constant.value }];

    return scope.bindings.find((candidate) => candidate.name === part.name)?.parts ?? [part];
  });
}

/**
 * Returns the binding that a region ascends, or nothing where it ascends none.
 *
 * The assignment back is what makes an ascent an ascent, and it is what keeps a loop that merely computes a
 * parent per item out of the report. One intermediate binding is followed, since comparing a level against its
 * parent forces the parent into one.
 */
function findAscendedBinding(region: string): string | undefined {
  const assignments = listSimpleAssignments(region);

  for (const match of region.matchAll(DIRNAME_ASCENT)) {
    const subject = match.groups?.['subject'];
    const target = readAssignedTarget(region, match.index);
    if (subject === undefined || target === undefined) continue;
    if (target === subject) return subject;

    const isCarriedBack = assignments.some(
      (assignment) => assignment.target === subject && assignment.value === target,
    );
    if (isCarriedBack) return subject;
  }

  return undefined;
}

/**
 * Returns the offset of the brace opening a loop's body, or nothing where the head never closes or the body is a
 * single unbraced statement. Such a body goes unreported rather than being read as the next brace group in the
 * source, which opens something else and would put the finding on a line the loop does not hold.
 */
function findBodyStart(code: string, afterKeyword: number, isDoLoop: boolean): number | undefined {
  let index = afterKeyword;

  if (!isDoLoop) {
    const head = readBalancedGroup(code, index, PARENTHESES);
    if (head === undefined) return undefined;
    index = head.end;
  }

  while (index < code.length && WHITESPACE.test(code.charAt(index))) index += 1;

  return code.charAt(index) === '{' ? index : undefined;
}

/**
 * Returns the offset at which an expression opening at `from` ends: the first comma or semicolon outside every
 * bracket, the bracket closing the group that holds the expression, or `limit`.
 */
function findExpressionEnd(code: string, from: number, limit: number): number {
  let depth = 0;

  for (let index = from; index < limit; index += 1) {
    const character = code.charAt(index);
    if (BRACKET_OPENERS.has(character)) depth += 1;
    else if (BRACKET_CLOSERS.has(character)) {
      if (depth === 0) return index;
      depth -= 1;
    } else if ((character === ',' || character === ';') && depth === 0) return index;
  }

  return limit;
}

/** Reports whether one loop sits inside another. */
function isNested(inner: Loop, outer: Loop): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

/**
 * Lists every binding that a loop declares with a value and never assigns again, with the expanded parts of that
 * value.
 *
 * A binding declared more than once in the loop, or reassigned there, holds no one value and is left out. A value
 * ends at the first comma or semicolon outside every bracket, so in a source written without semicolons it runs on
 * into the statements after it, and a path read through it holds no name.
 */
function listLoopBindings(
  code: string,
  source: string,
  loop: Loop,
  subject: string,
  constants: readonly StringConstant[],
): LoopBinding[] {
  const region = code.slice(loop.start, loop.end);
  const declarationCounts = countMatchesByName(region, DECLARED_NAME);
  const reassignmentCounts = countMatchesByName(region, REASSIGNMENT);
  const bindings: LoopBinding[] = [];

  for (const match of region.matchAll(DECLARATION)) {
    const name = match.groups?.['name'];
    if (name === undefined || declarationCounts.get(name) !== 1 || reassignmentCounts.has(name)) continue;

    const valueStart = loop.start + match.index + match[0].length;
    const parts = readPathParts(code, source, valueStart, findExpressionEnd(code, valueStart, loop.end));
    if (parts === undefined) continue;

    // A value can read only the bindings declared before it, so each expands against those already listed.
    bindings.push({ name, parts: expandPathParts(parts, { bindings, constants }, subject) });
  }

  return bindings;
}

/** Locates every loop in a source, each spanning its keyword through its braced body. */
function listLoops(code: string): Loop[] {
  const loops: Loop[] = [];

  for (const match of code.matchAll(LOOP_KEYWORD)) {
    const bodyStart = findBodyStart(code, match.index + match[0].length, match.groups?.['keyword'] === 'do');
    const body = bodyStart === undefined ? undefined : readBalancedGroup(code, bodyStart, BRACES);
    if (body !== undefined) loops.push({ end: body.end, start: match.index });
  }

  return loops;
}

/**
 * Returns the names that a loop probes each level for, or nothing where it probes for none.
 *
 * A probe is a read of a path built from the binding that the loop ascends, written in place or reached through a
 * binding or a constant in `scope`, which is what separates a search of the chain from a bare ascent. Only the path
 * is read, so an encoding or an option passed beside it is no name. The list is empty when the loop reads the level
 * itself rather than a name under it, as a read of its entries does.
 */
function listProbedNames(
  code: string,
  source: string,
  loop: Loop,
  subject: string,
  scope: PathScope,
): string[] | undefined {
  const names: string[] = [];
  let isProbing = false;

  for (const match of code.slice(loop.start, loop.end).matchAll(LEVEL_PROBE)) {
    const argumentList = readBalancedGroup(code, loop.start + match.index + match[0].length - 1, PARENTHESES);
    if (argumentList === undefined) continue;

    const pathStart = argumentList.start + 1;
    const parts = readPathParts(code, source, pathStart, findExpressionEnd(code, pathStart, argumentList.end - 1));
    const expanded = parts === undefined ? [] : expandPathParts(parts, scope, subject);
    const subjectIndex = expanded.findIndex((part) => part.kind === 'read' && part.name === subject);
    if (subjectIndex === -1) continue;

    isProbing = true;
    const name = readProbedName(expanded.slice(subjectIndex + 1));
    if (name !== undefined) names.push(name);
  }

  return isProbing ? names : undefined;
}

/** Lists every assignment of one bare binding to another. */
function listSimpleAssignments(region: string): BindingAssignment[] {
  const assignments: BindingAssignment[] = [];

  for (const match of region.matchAll(SIMPLE_ASSIGNMENT)) {
    const target = match.groups?.['target'];
    const value = match.groups?.['value'];
    if (target !== undefined && value !== undefined) assignments.push({ target, value });
  }

  return assignments;
}

/**
 * Lists every `const` in a source that holds a string literal and is the only declaration of its name. A text scan
 * cannot see scope, so a name declared twice anywhere in the source holds no one value.
 */
function listStringConstants(code: string, source: string): StringConstant[] {
  const constants: StringConstant[] = [];

  const declarationCounts = countMatchesByName(code, DECLARED_NAME);

  for (const match of code.matchAll(STRING_CONSTANT)) {
    const name = match.groups?.['name'];
    const value = readLiteral(source, match.indices?.groups?.['literal']);
    if (name === undefined || value === undefined) continue;
    if (declarationCounts.get(name) === 1) constants.push({ name, value });
  }

  return constants;
}

/** Returns the binding that the assignment opening at an offset assigns to, or nothing where none opens there. */
function readAssignedTarget(region: string, offset: number): string | undefined {
  const { before } = readAnchoredWindow(region, offset, ASSIGNMENT_WINDOW);

  return ASSIGNED_TARGET.exec(before)?.groups?.['target'];
}

/**
 * Reads the expression between two offsets as the names that it reads and the literal text that it holds, in
 * source order, or nothing when a template in it never closes.
 *
 * A literal's text is read from the source beneath. A template contributes the chunks of its text with the parts of
 * each interpolation between them.
 */
function readPathParts(code: string, source: string, start: number, end: number): PathPart[] | undefined {
  const parts: PathPart[] = [];
  let resumeAt = start;

  for (const match of code.slice(start, end).matchAll(PATH_TOKEN)) {
    const offset = start + match.index;
    if (offset < resumeAt) continue;

    const name = match.groups?.['name'];
    const quoted = match.groups?.['quoted'];
    if (name !== undefined) {
      parts.push({ kind: 'read', name });
    } else if (quoted !== undefined) {
      parts.push({ kind: 'text', text: source.slice(offset + 1, offset + quoted.length - 1) });
    } else {
      const template = readTemplateParts(code, source, offset, end);
      if (template === undefined) return undefined;
      parts.push(...template.parts);
      resumeAt = template.end;
    }
  }

  return parts;
}

/**
 * Returns the level-relative name that the parts past the ascended binding hold, or nothing when a read remains
 * among them or they hold no text.
 *
 * Each literal is a segment of the name, so `join(dir, 'a', 'b')`, `dir + '/a/b'`, and `${dir}/a/b` all read as
 * `a/b`.
 */
function readProbedName(parts: readonly PathPart[]): string | undefined {
  const segments: string[] = [];

  for (const part of parts) {
    if (part.kind === 'read') return undefined;
    if (part.text !== '') segments.push(part.text);
  }

  const name = segments.join('/').replaceAll(SEPARATOR_RUN, '/').replace(LEADING_SEPARATOR, '');

  return name === '' ? undefined : name;
}

/**
 * Reads the template opening at an offset, or nothing when it does not close before `end`.
 *
 * Blanking empties a template's text and keeps each `${`, so the first backtick or `${` in the code past a chunk
 * of text is the one that ends it.
 */
function readTemplateParts(code: string, source: string, open: number, end: number): TemplateParts | undefined {
  const parts: PathPart[] = [];
  let textStart = open + 1;

  for (;;) {
    const close = code.indexOf('`', textStart);
    if (close === -1 || close >= end) return undefined;

    const interpolation = code.indexOf('${', textStart);
    if (interpolation === -1 || interpolation > close) {
      parts.push({ kind: 'text', text: source.slice(textStart, close) });
      return { end: close + 1, parts };
    }

    parts.push({ kind: 'text', text: source.slice(textStart, interpolation) });

    const group = readBalancedGroup(code, interpolation + 1, BRACES);
    if (group === undefined || group.end > end) return undefined;

    const interpolated = readPathParts(code, source, group.start + 1, group.end - 1);
    if (interpolated === undefined) return undefined;

    parts.push(...interpolated);
    textStart = group.end;
  }
}

// endregion | Helpers
