/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.objects.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent these checks rest on.
 *
 * Two of the three checks take inventory rather than banning a pattern: a guarded prototype call and a
 * hand-rolled record guard are correct code that a published utility expresses better. The serialization
 * comparison is a `warn`, because it is a defect: it answers the wrong question about the values it compares.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listObjectIdioms } from '../../src/readiness/listObjectIdioms.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.objects';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/objects#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listObjectIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test writes these forms deliberately, and a bootstrap wrapper hand-rolls its object handling so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source reaches hasOwnProperty through the prototype',
      id: 'no-hand-rolled-own-property',
      kinds: ['own-property-call'],
      severity: 'recommend',
      fix: `Object.hasOwn is the platform form and is enough wherever the result narrows nothing: it takes the target and the key directly. Take hasOwnProperty from ${PACKAGE_NAME}/candidate where the call guards a property read, since it returns a type predicate that narrows the target and Object.hasOwn returns a bare boolean. Reference: ${README_URL}`,
    },
    {
      name: 'No source guards a record by hand',
      id: 'no-hand-rolled-record-guard',
      kinds: ['record-inline'],
      severity: 'recommend',
      fix: `Replace each expression named above with isRecord from ${PACKAGE_NAME} where it excludes arrays, and isRecordOrArray where it admits them. Both return a type predicate, so the narrowing the expression performed is preserved. For the stricter question of whether a value carries Object.prototype and nothing exotic, isPlainObject answers it; the expressions named above do not ask it. Reference: ${README_URL}`,
    },
    {
      name: 'No source compares two serializations',
      id: 'no-stringify-comparison',
      kinds: ['stringify-compare'],
      severity: 'warn',
      fix: `Replace each comparison named above with isEqual from ${PACKAGE_NAME}/candidate. Comparing serializations answers the wrong question twice: the result is key-order dependent, so two objects carrying the same entries in a different order compare unequal, and a Set serializes as an empty object whatever it holds, so any two Sets compare equal. isEqual sorts keys and converts Sets to arrays before comparing. Mind what serialization drops: a value carrying a function, a symbol, or undefined compares by what survives, under isEqual as much as by hand. Reference: ${README_URL}`,
    },
  ],
});
