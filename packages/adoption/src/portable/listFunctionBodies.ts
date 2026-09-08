import { BRACES, PARENTHESES, readBalancedGroup } from './readBalancedGroup.ts';

export interface FunctionBody {
  /** One past the reported group's closing brace. */
  bodyEnd: number;
  /** The reported group's opening brace. */
  bodyStart: number;
  /** The first parameter's name, where the list opens with a plain identifier. */
  firstParameter?: string;
  /** The function head's own offset, ahead of the reported group. */
  headStart: number;
  name: string;
}

// A type-parameter list sits between the name and the parameters, and a guard that narrows to a type its
// caller names cannot be written without one. `[^<>]*` declines a list nesting a further `<...>`, which leaves
// such a head unreported rather than matching a prefix of it.
const FUNCTION_HEAD =
  /(?:function\s+(?<declared>\w+)\s*(?:<[^<>]*>\s*)?\(|(?:const|let|var)\s+(?<bound>\w+)[^=;]*=\s*(?:async\s+)?(?:function\s*)?(?:<[^<>]*>\s*)?\((?<arrowParameters>[^)]*)\)[^=;{]*=>)/g;
// A plain first parameter runs to the delimiter that ends it: another parameter, a type annotation, a default,
// or the optional marker. A destructuring pattern, a rest element, and an empty list all fail the opening
// character class.
const PLAIN_PARAMETER = /^\s*(?<name>[A-Za-z_$][\w$]*)\s*(?=[,:=?]|$)/;

/**
 * Lists every named function in a source, each located by its head and the first balanced brace group past its
 * parameter list.
 *
 * A detector reads the body to judge what a whole function does, which is the strongest finding available: One
 * substitution retires a function rather than a single expression. The first parameter is reported alongside,
 * so a detector can additionally require the body to test the function's own argument. Only a braced group is
 * reported, so a concise arrow returning an expression falls to per-site classification instead.
 *
 * The group is the body except where a `function`'s return-type annotation contains a brace of its own, as an
 * object type or inside a generic argument. There the annotation's group is reported in the body's place, and an
 * overload signature with a brace is reported as though it had a body. Telling a type's braces from a
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
    const name = head.groups?.['declared'] ?? head.groups?.['bound'];
    const from = findBodySearchStart(source, head);
    const body = from === undefined ? undefined : readBalancedGroup(source, from, BRACES);

    // A `;` between the parameter list and the brace ends a declaration with no body, whose next brace
    // opens something else.
    if (
      name !== undefined &&
      from !== undefined &&
      body !== undefined &&
      !source.slice(from, body.start).includes(';')
    ) {
      const firstParameter = findFirstParameterName(readParameterText(source, head));
      bodies.push({
        bodyEnd: body.end,
        bodyStart: body.start,
        ...(firstParameter !== undefined && { firstParameter }),
        headStart: head.index,
        name,
      });
    }

    head = FUNCTION_HEAD.exec(source);
  }

  return bodies;
}

// region | Helpers

/**
 * Returns the offset from which the brace group is searched, or nothing where the parameter list never closes.
 *
 * A `function` head matches only as far as its opening parenthesis, so the parameter list is read past before
 * any brace counts: A destructured parameter, an object default, or an inline type literal would otherwise
 * supply the first one. An arrow head already spans its parameters and its `=>`.
 */
function findBodySearchStart(source: string, head: RegExpExecArray): number | undefined {
  if (head.groups?.['declared'] === undefined) return head.index + head[0].length;
  return readBalancedGroup(source, head.index, PARENTHESES)?.end;
}

/**
 * Returns the name the parameter list opens with, or nothing where it opens with anything but a plain
 * identifier.
 *
 * A destructuring pattern and a rest element bind no single name at the first position, so a detector
 * anchoring on the function's own argument has to decline such a function rather than read past the pattern to
 * the identifier inside it.
 */
function findFirstParameterName(parameterText: string | undefined): string | undefined {
  if (parameterText === undefined) return undefined;
  return PLAIN_PARAMETER.exec(parameterText)?.groups?.['name'];
}

/** Returns the text between a head's parentheses, or nothing where the list never closes. */
function readParameterText(source: string, head: RegExpExecArray): string | undefined {
  const arrowParameters = head.groups?.['arrowParameters'];
  if (arrowParameters !== undefined) return arrowParameters;

  const group = readBalancedGroup(source, head.index, PARENTHESES);
  return group === undefined ? undefined : source.slice(group.start + 1, group.end - 1);
}

// endregion | Helpers
