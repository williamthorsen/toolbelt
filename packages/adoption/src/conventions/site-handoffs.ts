// A subscript's bracket follows the expression that it indexes: an identifier, a call or group, another
// subscript, or a string, reached directly or through optional chaining. Every other bracket opens an array
// literal.
const SUBSCRIPT_TAIL = /(?<token>[\w$]+|[)\]'"`])\s?(?:\?\.)?\s?\[\s?$/;
// Keywords that a bracket may follow without being a subscript, since each one takes an expression and an
// array literal can be that expression. `return[0]` is valid JavaScript and returns an array.
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
 * Two kits recognize `Math.floor(Math.random() * N)`, and this question decides which one claims a given
 * site: A subscript is `toolbelt.arrays`' random-item idiom, and `toolbelt.numbers` declines it. Both read
 * the answer from here, so a consumer installing both packages cannot see one line reported twice under
 * conflicting advice.
 *
 * Takes the condensed lookbehind produced by `readAnchoredWindow`. Condensing collapses each whitespace run to
 * a single space without removing it, which keeps `arr[` distinguishable from `return [`. A single
 * space is tolerated on either side of the bracket, so a subscript wrapped by a formatter reads the same as one
 * that it left on a line: The detectors reading this answer are formatter-tolerant at their own anchors, and a
 * rule deciding which of them owns a site has to be tolerant at the same points or the two disagree.
 *
 * @internal
 */
export function isArraySubscript(before: string): boolean {
  const token = SUBSCRIPT_TAIL.exec(before)?.groups?.['token'];

  return token !== undefined && !EXPRESSION_KEYWORDS.has(token);
}

/**
 * Reports whether the names probed at one level of a directory walk make the walk a project-root search.
 *
 * Two kits recognize an ascent that probes each level for a name, and this question decides which one claims a
 * given site: A walk looking for `package.json` is `toolbelt.packaging`'s project-root idiom, which
 * `findProjectRoot` covers, and `toolbelt.filesystem` declines it. Both read the answer from here, so a
 * consumer installing both packages cannot see one loop reported twice under conflicting advice.
 *
 * One manifest among the names carries the verdict, however many names sit beside it. A walk probing
 * `package.json` and `.git` together looks for the directory that holds a project, which is what
 * `findProjectRoot` resolves from exactly such a marker list; a walk probing `.git` alone looks for a named
 * entry on the chain, which `findDirectoryChainMatch` returns, so it stays with `toolbelt.filesystem`.
 *
 * @internal
 */
export function isProjectRootSearch(names: readonly string[]): boolean {
  return names.includes('package.json');
}
