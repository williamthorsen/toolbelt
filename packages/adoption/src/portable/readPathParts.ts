import { listTemplateLiterals, type TemplateLiteral } from './listTemplateLiterals.ts';

/** A name that a path reads as a value, or the text of a literal that it holds. */
export type PathPart = { kind: 'read'; name: string } | { kind: 'text'; text: string };

// The brackets that hold a comma inside one expression: a call's, an array's, an object's, and an interpolation's.
const BRACKET_CLOSERS = new Set([')', ']', '}']);
const BRACKET_OPENERS = new Set(['(', '[', '{']);
// A quoted literal, the backtick opening a template, or a name read as a value, which leaves out the name of a member.
const PATH_TOKEN = /(?<quoted>(?<quote>['"])[^'"]*\k<quote>)|`|(?<![\w$.])(?<name>[A-Za-z_$][\w$]*)/g;

/**
 * Returns the offset at which an expression opening at `from` ends: the first comma or semicolon outside every
 * bracket, the bracket closing the group that holds the expression, or `limit`.
 *
 * @internal
 */
export function findExpressionEnd(code: string, from: number, limit: number): number {
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

/**
 * Reads the expression between two offsets as the names that it reads and the literal text that it holds, in
 * source order, or nothing when a template in it does not close before `end`.
 *
 * Takes code blanked by `blankNonCode` and the source beneath it, from which a literal's text is read. A template
 * contributes the chunks of its text with the parts of each interpolation between them.
 *
 * @internal
 */
export function readPathParts(code: string, source: string, start: number, end: number): PathPart[] | undefined {
  return readParts(code, source, listTemplateLiterals(code), start, end);
}

// region | Helpers

/** Reads the parts of the expression between two offsets, taking each template from a listing of the code. */
function readParts(
  code: string,
  source: string,
  templates: readonly TemplateLiteral[],
  start: number,
  end: number,
): PathPart[] | undefined {
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
      const template = templates.find((candidate) => candidate.start === offset);
      if (template === undefined || template.end > end) return undefined;

      const templateParts = readTemplateParts(code, source, templates, template);
      if (templateParts === undefined) return undefined;
      parts.push(...templateParts);
      resumeAt = template.end;
    }
  }

  return parts;
}

/** Reads a template's text chunks with the parts of each interpolation between them. */
function readTemplateParts(
  code: string,
  source: string,
  templates: readonly TemplateLiteral[],
  template: TemplateLiteral,
): PathPart[] | undefined {
  const parts: PathPart[] = [];
  let textStart = template.start + 1;

  for (const interpolation of template.interpolations) {
    parts.push({ kind: 'text', text: source.slice(textStart, interpolation.start) });

    const interpolated = readParts(code, source, templates, interpolation.start + 2, interpolation.end - 1);
    if (interpolated === undefined) return undefined;

    parts.push(...interpolated);
    textStart = interpolation.end;
  }

  parts.push({ kind: 'text', text: source.slice(textStart, template.end - 1) });

  return parts;
}

// endregion | Helpers
