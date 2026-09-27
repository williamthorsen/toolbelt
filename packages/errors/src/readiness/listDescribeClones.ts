import { condenseWhitespace, listFunctionBodies } from '@williamthorsen/toolbelt.adoption';

export interface DescribeClone {
  end: number;
  name: string;
  start: number;
}

/**
 * Lists the functions whose whole body is a hand-rolled `describeError`.
 *
 * Takes the blanked code produced by `listErrorSites`, so the text of a body's strings and comments is already
 * replaced by spaces.
 *
 * A local re-implementation is the strongest adoption finding available, because one substitution replaces a
 * whole function rather than a single expression. Detection under-matches: A body is a clone only when every
 * statement in it is a `return` or an `if` guarding one. A function doing anything besides describing is left to
 * the per-site classification.
 *
 * @internal
 */
export function listDescribeClones(source: string): DescribeClone[] {
  return listFunctionBodies(source)
    .filter((fn) => isDescribeBody(source.slice(fn.bodyStart, fn.bodyEnd)))
    .map((fn) => ({ end: fn.bodyEnd, name: fn.name, start: fn.headStart }));
}

// region | Helpers

/** Reports whether a function body does nothing but describe a thrown value. */
function isDescribeBody(body: string): boolean {
  const collapsed = condenseWhitespace(body).trim();
  if (!collapsed.includes('instanceof Error') || !/return [\w.]+\.message/.test(collapsed)) return false;

  const statements = collapsed
    .replaceAll(/if \([^()]*\)/g, '')
    .replaceAll(/else/g, '')
    .replaceAll(/[{}]/g, ' ')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');

  return statements.length > 0 && statements.every((statement) => statement.startsWith('return'));
}

// endregion | Helpers
