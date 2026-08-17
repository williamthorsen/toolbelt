import { BRACES, readBalancedGroup } from './readBalancedGroup.ts';

export interface FunctionBody {
  /** One past the body's closing brace. */
  bodyEnd: number;
  /** The body's opening brace. */
  bodyStart: number;
  /** The function head's own offset, ahead of the body. */
  headStart: number;
  name: string;
}

const FUNCTION_HEAD =
  /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)[^=;]*=\s*(?:async\s+)?(?:function\s*)?\([^)]*\)[^=;{]*=>)/g;

/**
 * Lists every named function in a source, each located by its head and its brace-delimited body.
 *
 * A detector reads the body to judge what the whole function does, which is the strongest finding available:
 * one substitution retires a function rather than a single expression. Only a braced body is reported, so a
 * concise arrow returning an expression falls to per-site classification instead.
 *
 * @internal
 */
export function listFunctionBodies(source: string): FunctionBody[] {
  const bodies: FunctionBody[] = [];

  FUNCTION_HEAD.lastIndex = 0;
  let head = FUNCTION_HEAD.exec(source);
  while (head !== null) {
    const name = head[1] ?? head[2];
    const from = head.index + head[0].length;
    const body = readBalancedGroup(source, from, BRACES);

    // A `;` ahead of the first brace ends a declaration carrying no body, whose next brace opens something else.
    if (name !== undefined && body !== undefined && !source.slice(from, body.start).includes(';')) {
      bodies.push({ bodyEnd: body.end, bodyStart: body.start, headStart: head.index, name });
    }

    head = FUNCTION_HEAD.exec(source);
  }

  return bodies;
}
