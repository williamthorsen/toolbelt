import { BRACES, PARENTHESES, readBalancedGroup } from './readBalancedGroup.ts';

export interface FunctionLiteral {
  /** An arrow's text past its `=>`, or a `function` expression's text from its body's opening brace. */
  body: string;
  /** The parameter list's interior, without its delimiters, or the sole parameter of a bare-parameter arrow. */
  parameters: string;
}

const BARE_PARAMETER_ARROW = /^(?<parameter>[\w$]+)\s*=>/;
const FUNCTION_KEYWORD = /^function\b/;

/**
 * Splits the function literal that opens a text into its parameter list and its body, or returns nothing when
 * the text opens with something else.
 *
 * Reads the bare-parameter arrow, the parenthesized arrow, and the `function` expression named or anonymous.
 * Every body runs to the end of the text, so a caller decides for itself where the body ends. A leading
 * `async`, a bare reference, and a type-parameter list ahead of an arrow's parameters all yield nothing.
 *
 * A `function` expression's body is the first balanced brace group past its parameter list. When a return-type
 * annotation contains a brace of its own, as an object type or inside a generic argument, the annotation's group
 * is read in the body's place: Telling a type's braces from a block's takes a parser rather than delimiter
 * counting.
 *
 * @internal
 */
export function readFunctionLiteral(text: string): FunctionLiteral | undefined {
  const trimmed = text.trimStart();

  const bare = BARE_PARAMETER_ARROW.exec(trimmed);
  if (bare?.groups?.['parameter'] !== undefined) {
    return { body: trimmed.slice(bare[0].length), parameters: bare.groups['parameter'] };
  }

  // An arrow's parameter list opens the text, whereas a `function` expression's follows the keyword and any name.
  const isFunctionExpression = FUNCTION_KEYWORD.test(trimmed);
  const list = readBalancedGroup(trimmed, 0, PARENTHESES);
  if (list === undefined || (!isFunctionExpression && list.start !== 0)) return undefined;

  const parameters = trimmed.slice(list.start + 1, list.end - 1);
  const bodyStart = isFunctionExpression ? findBlockStart(trimmed, list.end) : findArrowBodyStart(trimmed, list.end);

  return bodyStart === undefined ? undefined : { body: trimmed.slice(bodyStart), parameters };
}

// region | Helpers

/** Returns the offset past an arrow's `=>`, which a return-type annotation may precede. */
function findArrowBodyStart(text: string, listEnd: number): number | undefined {
  const arrow = text.indexOf('=>', listEnd);
  return arrow === -1 ? undefined : arrow + 2;
}

/** Returns the offset of the first balanced brace group past a parameter list. */
function findBlockStart(text: string, listEnd: number): number | undefined {
  return readBalancedGroup(text, listEnd, BRACES)?.start;
}

// endregion | Helpers
