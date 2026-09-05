import { getLineAtOffset } from '@williamthorsen/toolbelt.adoption';

// The guarded call, with `\s*` at every joint because the expression has no fixed-width span to bound and a
// formatter may wrap it at any of them. The leading lookbehind declines a member of the same name reached
// through another object.
const OWN_PROPERTY_CALL = /(?<![\w$.])Object\s*\.\s*prototype\s*\.\s*hasOwnProperty\s*\.\s*call\s*\(/g;

/**
 * Lists the line of every guarded `hasOwnProperty` call in a source file.
 *
 * Takes the blanked code produced by `listObjectIdioms`, so a call written in a comment or a literal is not one.
 *
 * The unguarded form, calling the method on the value itself, is not claimed: It is a defect rather than a
 * verbose spelling, and eslint's recommended `no-prototype-builtins` already reports it.
 *
 * @internal
 */
export function listOwnPropertyCallLines(source: string): number[] {
  return source
    .matchAll(OWN_PROPERTY_CALL)
    .map((match) => getLineAtOffset(source, match.index))
    .toArray();
}
