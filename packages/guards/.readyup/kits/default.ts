/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.guards.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * Every finding here is a whole function that one import retires, which is why two of the three checks report
 * at `warn`: The code works, but the function duplicates one the project already has installed. The number
 * guard is the exception and reports at `recommend`, because its substitution is the only inexact one, and it
 * carries an id of its own so a project can decline that advice by pragma while keeping the rest.
 *
 * Two neighbouring kits read overlapping territory and neither claims what this one does, so no hand-off rule
 * is needed: `toolbelt.objects` claims `typeof X === 'object'` only in conjunction with a null test, and
 * `toolbelt.errors` claims `instanceof Error`, which the first-parameter anchor cannot reach.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listGuardClones } from '../../src/readiness/listGuardClones.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.guards';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/guards#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listGuardClones,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test writes these shapes deliberately, and a bootstrap wrapper hand-rolls its guards so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source defines its own assertion',
      id: 'no-assertion-clone',
      kinds: ['assert-clone', 'nullish-assert-clone'],
      fix: `Delete the function named above and import assert from ${PACKAGE_NAME}, or assertIsNonNullable where the function asserts that a value is neither null nor undefined. One import retires the whole helper, and both carry an asserts signature, so a caller that relied on the narrowing keeps it. Reference: ${README_URL}`,
    },
    {
      name: 'No source defines its own type guard',
      id: 'no-predicate-clone',
      kinds: ['boolean-clone', 'non-nullable-clone', 'nullish-clone', 'string-clone'],
      fix: `Delete the function named above and import the guard that it re-implements from ${PACKAGE_NAME}: isString, isBoolean, isNonNullable, or isNullish. Each returns a type predicate, so the narrowing that the function performed is preserved. Reference: ${README_URL}`,
    },
    {
      name: 'No source defines its own number guard',
      id: 'no-number-guard-clone',
      kinds: ['number-clone'],
      severity: 'recommend',
      fix: `Import isNumber from ${PACKAGE_NAME} in place of the function named above. Weigh the difference before taking it: isNumber returns false for NaN, which typeof reports as a number, so a function testing typeof alone changes behavior on NaN. A function that already excludes NaN is an exact substitution. Reference: ${README_URL}`,
    },
  ],
});
