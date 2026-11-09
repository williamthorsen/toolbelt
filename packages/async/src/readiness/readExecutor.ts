import { BRACES, readBalancedGroup, readFunctionLiteral } from '@williamthorsen/toolbelt.adoption';

export interface Executor {
  /** The body with a block's braces stripped, so that a concise arrow and a braced body read alike. */
  body: string;
  /** The first parameter's name, empty when the function takes none. */
  parameter: string;
}

const IDENTIFIER = /^[\w$]+$/;
// A parameter ends where its type annotation, its default, or the next parameter begins.
const PARAMETER_TAIL = /[:=,]/;

/**
 * Returns the first parameter and the body of a function literal that opens a text, or nothing when the text
 * opens with something else.
 *
 * A bare reference passed where a function literal was expected yields nothing, its body not being here to read,
 * and so does a first parameter that is destructured rather than named.
 *
 * @internal
 */
export function readExecutor(text: string): Executor | undefined {
  const literal = readFunctionLiteral(text);
  if (literal === undefined) return undefined;

  const parameter = readFirstParameter(literal.parameters);

  return parameter === undefined ? undefined : { body: readBody(literal.body), parameter };
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

// endregion | Helpers
