import { type AdoptionSite, getLineAtOffset, listFunctionBodies } from '@williamthorsen/toolbelt.adoption';

import { type AssertionCloneKind, findAssertionClone } from './findAssertionClone.ts';
import { findPredicateClone, type PredicateCloneKind } from './findPredicateClone.ts';

export type GuardCloneKind = AssertionCloneKind | PredicateCloneKind;

/**
 * Lists every function in a source whose whole body re-implements a guard that this package publishes.
 *
 * A clone is the strongest adoption finding available, because one import replaces a whole function rather than
 * a single expression. Detection under-matches by design, on two rules: The guard has to be the function's
 * entire body, and the value tested has to be the function's own first parameter. A function testing anything
 * else is a domain helper that the published guard could not replace, and reporting it would be noise.
 *
 * Takes the code blanked by the kit assembler, so a guard written in a comment or a string is not one, and the
 * predicate detector reads its compared tag from the source beneath.
 *
 * @internal
 */
export function listGuardClones(code: string, source: string): Array<AdoptionSite<GuardCloneKind>> {
  return listFunctionBodies(code).flatMap((fn) => {
    const parameter = fn.firstParameter;
    if (parameter === undefined) return [];

    const body = code.slice(fn.bodyStart, fn.bodyEnd);
    const kind = findPredicateClone(body, source, fn.bodyStart, parameter) ?? findAssertionClone(body, parameter);

    return kind === undefined ? [] : { kind, line: getLineAtOffset(code, fn.headStart), symbol: fn.name };
  });
}
