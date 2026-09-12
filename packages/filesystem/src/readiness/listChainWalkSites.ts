import {
  type AdoptionSite,
  BRACES,
  getLineAtOffset,
  isProjectRootSearch,
  PARENTHESES,
  readAnchoredWindow,
  readBalancedGroup,
  readLiteral,
} from '@williamthorsen/toolbelt.adoption';

export type ChainWalkKind = 'chain-probe' | 'chain-walk';

// The binding that an assignment opening at the anchor assigns to, read off the condensed lookbehind. A
// comparison and a compound assignment each put a character between the name and the `=`, so neither reads as one.
const ASSIGNED_TARGET = /(?<target>[A-Za-z_$][\w$]*) ?= ?$/;
// Only the lookbehind is read, and only far enough to see the binding that takes the ascent.
const ASSIGNMENT_WINDOW = { lookahead: 0, lookbehind: 80 };
// A literal that blanking emptied and whose quotes it kept. What it holds is read from the source beneath.
const BLANKED_LITERAL = /(?<quote>['"`])[^'"`]*\k<quote>/g;
// `dirname` called on a bare binding, through any receiver or none, so `path.dirname`, an aliased import, and a
// destructured import all match. The assignment-back rule carries the precision, so the anchor need not.
const DIRNAME_ASCENT = /(?:[A-Za-z_$][\w$]*\s*\.\s*)?\bdirname\s*\(\s*(?<subject>[A-Za-z_$][\w$]*)\s*\)/g;
// Every name read as a value, which leaves out the name of a member.
const IDENTIFIER = /(?<![\w$.])[A-Za-z_$][\w$]*/g;
// What blanking leaves of an interpolation, which is the expression itself. Dropping it and the separator behind
// it leaves the level-relative name that a probe built from the loop's binding looks for.
const INTERPOLATION = /\$\{[^{}]*\}/g;
const LEADING_SEPARATOR = /^[/\\]+/;
// The reads by which a walk asks what a level holds, in their synchronous and their promise spelling alike.
const LEVEL_PROBE = /\b(?:access|exists|lstat|readdir|readFile|stat)(?:Sync)?\s*\(/g;
const LOOP_KEYWORD = /\b(?<keyword>do|for|while)\b/g;
// One bare binding assigned to another and nothing else, which is the step carrying an ascent back to the binding
// that it ascends.
const SIMPLE_ASSIGNMENT = /(?<![\w$])(?<target>[A-Za-z_$][\w$]*)\s*=(?!=)\s*(?<value>[A-Za-z_$][\w$]*)(?![\w$.([])/g;
const WHITESPACE = /\s/;

interface BindingAssignment {
  target: string;
  value: string;
}

interface ChainWalk {
  loop: Loop;
  site: AdoptionSite<ChainWalkKind>;
}

interface Loop {
  /** One past the body's closing brace. */
  end: number;
  /** The loop keyword's own offset. */
  start: number;
}

/**
 * Lists every hand-rolled walk to the filesystem root in a source, which is a loop that ascends by `dirname`.
 *
 * Takes the blanked code produced by `listFilesystemIdioms` and the source beneath it, so an ascent written in a
 * comment or a literal is not one while a probed name stays readable. Blanking preserves every offset, so a
 * reported line still names the line held by the source.
 *
 * A walk probing each level for a name reports as `chain-probe` and a bare ascent as `chain-walk`, the two
 * taking different substitutions. A walk probing for `package.json` is `toolbelt.packaging`'s and is dropped
 * here, on the rule that both kits read.
 *
 * The detector under-matches on purpose. A recursive walk-up function is no loop and goes unreported, as does an
 * ascent written as `resolve(dir, '..')` and a loop whose body is a single unbraced statement.
 *
 * @internal
 */
export function listChainWalkSites(code: string, source: string): Array<AdoptionSite<ChainWalkKind>> {
  const walks = listLoops(code).flatMap((loop) => describeChainWalk(code, source, loop) ?? []);

  // Every loop around an ascent holds it, and the innermost of them is the one whose head names the site.
  return walks
    .filter((walk) => walks.every((other) => other === walk || !isNested(other.loop, walk.loop)))
    .map((walk) => walk.site);
}

// region | Helpers

/** Describes the walk that a loop performs, or nothing where it performs none or another kit claims it. */
function describeChainWalk(code: string, source: string, loop: Loop): ChainWalk | undefined {
  const subject = findAscendedBinding(code.slice(loop.start, loop.end));
  if (subject === undefined) return undefined;

  const probedNames = listProbedNames(code, source, loop, subject);
  if (probedNames !== undefined && isProjectRootSearch(probedNames)) return undefined;

  return {
    loop,
    site: { kind: probedNames === undefined ? 'chain-walk' : 'chain-probe', line: getLineAtOffset(code, loop.start) },
  };
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

/** Reports whether one loop sits inside another. */
function isNested(inner: Loop, outer: Loop): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

/** Lists every name that a text reads as a value. */
function listIdentifiers(text: string): string[] {
  return text.match(IDENTIFIER) ?? [];
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

/** Lists the level-relative names held by the literals of a probe's arguments. */
function listProbedLiterals(source: string, argumentText: string, offset: number): string[] {
  const names: string[] = [];

  for (const match of argumentText.matchAll(BLANKED_LITERAL)) {
    const text = readLiteral(source, [offset + match.index, offset + match.index + match[0].length]);
    const name = text?.replaceAll(INTERPOLATION, '').replace(LEADING_SEPARATOR, '');
    if (name !== undefined && name !== '') names.push(name);
  }

  return names;
}

/**
 * Returns the names that a loop probes each level for, or nothing where it probes for none.
 *
 * A probe is a read of a path built from the binding that the loop ascends, which is what separates a search of
 * the chain from a bare ascent. The list is empty where the loop reads the level itself rather than a name under
 * it, as a read of its entries does.
 */
function listProbedNames(code: string, source: string, loop: Loop, subject: string): string[] | undefined {
  const region = code.slice(loop.start, loop.end);
  const names: string[] = [];
  let isProbing = false;

  for (const match of region.matchAll(LEVEL_PROBE)) {
    const argumentList = readBalancedGroup(region, match.index + match[0].length - 1, PARENTHESES);
    if (argumentList === undefined) continue;

    const argumentText = region.slice(argumentList.start + 1, argumentList.end - 1);
    if (!listIdentifiers(argumentText).includes(subject)) continue;

    isProbing = true;
    names.push(...listProbedLiterals(source, argumentText, loop.start + argumentList.start + 1));
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

/** Returns the binding that the assignment opening at an offset assigns to, or nothing where none opens there. */
function readAssignedTarget(region: string, offset: number): string | undefined {
  const { before } = readAnchoredWindow(region, offset, ASSIGNMENT_WINDOW);

  return ASSIGNED_TARGET.exec(before)?.groups?.['target'];
}

// endregion | Helpers
