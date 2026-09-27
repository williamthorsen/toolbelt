import { BRACES, PARENTHESES, readBalancedGroup } from '@williamthorsen/toolbelt.adoption';

export interface Executor {
  /** The body with a block's braces stripped, so that a concise arrow and a braced body read alike. */
  body: string;
  /** The first parameter's name, empty when the function takes none. */
  parameter: string;
}

// Whitespace is condensed before this pattern runs, so at most one space can appear between two tokens.
const BARE_PARAMETER_ARROW = /^(?<parameter>[\w$]+)\s?=>/;
const FUNCTION_KEYWORD = /^function\b/;
const IDENTIFIER = /^[\w$]+$/;
// A parameter ends where its type annotation, its default, or the next parameter begins.
const PARAMETER_TAIL = /[:=,]/;

/**
 * Returns the first parameter and the body of a function literal that opens a text, or nothing when the text
 * opens with something else.
 *
 * Reads the arrow in both its parenthesized and its bare-parameter spellings, and the `function` expression
 * named or anonymous. A bare reference passed where a function literal was expected yields nothing, its body
 * not being here to read, and so does a parameter that is destructured rather than named.
 *
 * `toolbelt.arrays` contains a more forgiving counterpart in `listBiasedShuffleLines`, which additionally strips
 * the parentheses of a cast and declines a combinator's own arrow. A comparator is commonly assembled and cast,
 * whereas a promise executor is written inline, so the two are kept apart until a third caller needs one reader.
 *
 * @internal
 */
export function readExecutor(text: string): Executor | undefined {
  const trimmed = text.trimStart();

  const bare = BARE_PARAMETER_ARROW.exec(trimmed);
  if (bare?.groups?.['parameter'] !== undefined) {
    return { body: readBody(trimmed.slice(bare[0].length)), parameter: bare.groups['parameter'] };
  }

  // An arrow's parameter list opens the text, whereas a `function` expression's follows the keyword and any name.
  const isFunctionExpression = FUNCTION_KEYWORD.test(trimmed);
  const parameters = readBalancedGroup(trimmed, 0, PARENTHESES);
  if (parameters === undefined || (!isFunctionExpression && parameters.start !== 0)) return undefined;

  const parameter = readFirstParameter(trimmed.slice(parameters.start + 1, parameters.end - 1));
  if (parameter === undefined) return undefined;

  const body = readTrailingBody(trimmed, parameters.end);

  return body === undefined ? undefined : { body, parameter };
}

// region | Helpers

/** Returns a body with a block's braces stripped, leaving a concise arrow's expression as it stands. */
function readBody(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('{')) return trimmed;

  const block = readBalancedGroup(trimmed, 0, BRACES);

  return block === undefined ? trimmed : trimmed.slice(block.start + 1, block.end - 1);
}

/** Returns the first parameter's name, or nothing when it is not a plain identifier. */
function readFirstParameter(parameters: string): string | undefined {
  const trimmed = parameters.trim();
  if (trimmed === '') return '';

  const name = trimmed.split(PARAMETER_TAIL)[0]?.trim() ?? '';

  return IDENTIFIER.test(name) ? name : undefined;
}

/**
 * Returns the body that follows a parameter list, or nothing when nothing does.
 *
 * A `function` expression's body is the brace group past its parameters, and an arrow's is whatever follows the
 * arrow. Anything between the parameter list and either one is a return-type annotation. A parenthesized value
 * that is no function literal reaches neither, which makes a wrapped reference yield nothing.
 */
function readTrailingBody(text: string, parametersEnd: number): string | undefined {
  if (FUNCTION_KEYWORD.test(text)) {
    const block = readBalancedGroup(text, parametersEnd, BRACES);
    return block === undefined ? undefined : text.slice(block.start + 1, block.end - 1);
  }

  const arrow = text.indexOf('=>', parametersEnd);

  return arrow === -1 ? undefined : readBody(text.slice(arrow + 2));
}

// endregion | Helpers
