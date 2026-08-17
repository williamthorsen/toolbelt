import { BRACES, PARENTHESES, readBalancedGroup } from './readBalancedGroup.ts';

export interface FunctionBody {
  /** One past the reported group's closing brace. */
  bodyEnd: number;
  /** The reported group's opening brace. */
  bodyStart: number;
  /** The function head's own offset, ahead of the body. */
  headStart: number;
  name: string;
}

const FUNCTION_HEAD =
  /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)[^=;]*=\s*(?:async\s+)?(?:function\s*)?\([^)]*\)[^=;{]*=>)/g;

/**
 * Lists every named function in a source, each located by its head and the first balanced brace group past its
 * parameter list.
 *
 * A detector reads the body to judge what a whole function does, which is the strongest finding available: one
 * substitution retires a function rather than a single expression. Only a braced group is reported, so a
 * concise arrow returning an expression falls to per-site classification instead.
 *
 * The group is the body except where a `function`'s return-type annotation carries a brace of its own, as an
 * object type or inside a generic argument. There the annotation's group is reported in the body's place, and a
 * brace-bearing overload signature is reported as though it had a body at all. Telling a type's braces from a
 * block's takes a parser rather than delimiter counting, so a detector whose verdict would be wrong on such a
 * function has to recognize it directly.
 *
 * @internal
 */
export function listFunctionBodies(source: string): FunctionBody[] {
  const bodies: FunctionBody[] = [];

  FUNCTION_HEAD.lastIndex = 0;
  let head = FUNCTION_HEAD.exec(source);
  while (head !== null) {
    const name = head[1] ?? head[2];
    const from = findBodySearchStart(source, head);
    const body = from === undefined ? undefined : readBalancedGroup(source, from, BRACES);

    // A `;` between the parameter list and the brace ends a declaration carrying no body, whose next brace
    // opens something else.
    if (
      name !== undefined &&
      from !== undefined &&
      body !== undefined &&
      !source.slice(from, body.start).includes(';')
    ) {
      bodies.push({ bodyEnd: body.end, bodyStart: body.start, headStart: head.index, name });
    }

    head = FUNCTION_HEAD.exec(source);
  }

  return bodies;
}

// region | Helpers

/**
 * Returns the offset the brace group is searched from, or nothing where the parameter list never closes.
 *
 * A `function` head matches only as far as its opening parenthesis, so the parameter list is read past before
 * any brace counts: a destructured parameter, an object default, or an inline type literal would otherwise
 * supply the first one. An arrow head already spans its parameters and its `=>`.
 */
function findBodySearchStart(source: string, head: RegExpExecArray): number | undefined {
  if (head[1] === undefined) return head.index + head[0].length;
  return readBalancedGroup(source, head.index, PARENTHESES)?.end;
}

// endregion | Helpers
