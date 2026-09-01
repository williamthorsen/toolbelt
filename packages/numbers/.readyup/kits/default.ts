/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.numbers.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent these checks rest on.
 *
 * The checks take inventory rather than banning a pattern. Every one of them is a `recommend`: a hand-rolled
 * clamp, decimal rounding, or random integer is correct code that a published utility expresses better, not a
 * defect. Nothing here is `error`, and nothing is `warn`.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listMathIdioms } from '../../src/readiness/listMathIdioms.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.numbers';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/numbers#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listMathIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test computes these values deliberately, and a bootstrap wrapper's hand-rolled arithmetic is what keeps
  // its build-first message alive through an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source clamps a value by hand',
      id: 'no-hand-rolled-clamp',
      kinds: ['clamp-nest'],
      severity: 'recommend',
      fix: `Replace each expression named above with clamp from ${PACKAGE_NAME}/candidate, called as clamp(value, { min, max }). It is not a silent substitution: clamp throws a RangeError on a reversed range or a NaN bound, where the nested Math calls return a value for both. Reference: ${README_URL}`,
    },
    {
      name: 'No source rounds to decimal places by hand',
      id: 'no-hand-rolled-round',
      kinds: ['round-scale'],
      severity: 'recommend',
      fix: `Replace each expression named above with round from ${PACKAGE_NAME}/candidate, called as round(value, places). The substitution is exact: round scales by the same power of ten these sites write out. Reference: ${README_URL}`,
    },
    {
      name: 'No source derives a random integer by hand',
      id: 'no-hand-rolled-random-integer',
      kinds: ['random-integer'],
      severity: 'recommend',
      fix: `Replace each expression named above with pickInteger from ${PACKAGE_NAME}/candidate, which also takes a seed. Mind the bound: Math.floor(Math.random() * N) stops at N - 1, where pickInteger's max is inclusive, so the replacement is pickInteger({ max: N - 1 }). A site indexing an array is left to toolbelt.arrays, whose pickItem covers it. Reference: ${README_URL}`,
    },
  ],
});
