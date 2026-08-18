// A subscript's bracket follows the expression it indexes: an identifier, a call or group, another subscript,
// or a string. Every other bracket opens an array literal.
const SUBSCRIPT_TAIL = /(?<token>[\w$]+|[)\]'"`])\s?\[$/;
// Keywords a bracket may follow without being a subscript, since each one takes an expression and an array
// literal is the expression it gets. `return[0]` is valid JavaScript and returns an array.
const EXPRESSION_KEYWORDS = new Set([
  'await',
  'case',
  'delete',
  'in',
  'new',
  'of',
  'return',
  'typeof',
  'void',
  'yield',
]);

/**
 * Reports whether the text preceding an offset puts it in array-subscript position.
 *
 * Two kits recognize `Math.floor(Math.random() * N)`, and which one claims a given site turns on this
 * question: a subscript is `toolbelt.arrays`' random-item idiom, and `toolbelt.numbers` declines it. Both read
 * the answer from here, so a consumer installing both packages cannot see one line reported twice under
 * conflicting advice.
 *
 * Takes the condensed lookbehind `readAnchoredWindow` produces. Condensing collapses each whitespace run to a
 * single space without removing it, which is what keeps `arr[` distinguishable from `return [`.
 *
 * @internal
 */
export function isArraySubscript(before: string): boolean {
  const token = SUBSCRIPT_TAIL.exec(before)?.groups?.['token'];

  return token !== undefined && !EXPRESSION_KEYWORDS.has(token);
}
