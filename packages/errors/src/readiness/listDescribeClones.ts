export interface DescribeClone {
  end: number;
  name: string;
  start: number;
}

const FUNCTION_HEAD =
  /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)[^=;]*=\s*(?:async\s+)?(?:function\s*)?\([^)]*\)[^=;{]*=>)/g;

/**
 * Lists the functions whose whole body is a hand-rolled `describeError`.
 *
 * A local re-implementation is the strongest adoption finding available, because one substitution retires a
 * whole function rather than a single expression. Detection deliberately under-matches: a body is a clone only
 * where every statement in it is a `return` or an `if` guarding one, so a function doing anything besides
 * describing is left to the per-site classification.
 *
 * @internal
 */
export function listDescribeClones(source: string): DescribeClone[] {
  const clones: DescribeClone[] = [];

  FUNCTION_HEAD.lastIndex = 0;
  let head = FUNCTION_HEAD.exec(source);
  while (head !== null) {
    const name = head[1] ?? head[2];
    const body = readBody(source, head.index + head[0].length);
    if (name !== undefined && body !== undefined && isDescribeBody(source.slice(body.start, body.end))) {
      clones.push({ end: body.end, name, start: head.index });
    }
    head = FUNCTION_HEAD.exec(source);
  }

  return clones;
}

// region | Helpers

/** Reports whether a function body does nothing but describe a thrown value. */
function isDescribeBody(body: string): boolean {
  const collapsed = body.replaceAll(/\s+/g, ' ').trim();
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

/** Locates a function body by matching braces from the first one at or after `from`. */
function readBody(source: string, from: number): { end: number; start: number } | undefined {
  const start = source.indexOf('{', from);
  if (start === -1 || source.slice(from, start).includes(';')) return undefined;

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return { end: index + 1, start };
    }
  }
  return undefined;
}

// endregion | Helpers
