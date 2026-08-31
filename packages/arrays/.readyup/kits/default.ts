/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.arrays.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * the consumer has. Installing the package is the consent these checks rest on.
 *
 * Two of the three checks take inventory rather than banning a pattern: a random item and a hand-rolled array
 * wrap are correct code that a published utility expresses better. The comparator is a `warn`, because it is a
 * defect: it does not order consistently, so the permutation it produces is not uniform either.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listArrayIdioms } from '../../src/readiness/listArrayIdioms.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.arrays';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/arrays#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listArrayIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test writes these forms deliberately, and a bootstrap wrapper hand-rolls its array handling so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source shuffles through a comparator',
      id: 'no-biased-shuffle',
      kinds: ['biased-shuffle'],
      severity: 'warn',
      fix: `Replace each call named above with shuffle from ${PACKAGE_NAME}/candidate, which walks the array backward swapping each item with one drawn at or before it, and takes a seed where a test needs the draw to repeat. A comparator deciding on a draw does not order consistently, and the engine sorting through it is free to produce any permutation, so the result is neither uniform nor the same across engines. Mind which method the site used: shuffle returns a new array, and shuffleInPlace is the one that mutates. Reference: ${README_URL}`,
    },
    {
      name: 'No source draws an array item by hand',
      id: 'no-hand-rolled-random-item',
      kinds: ['random-item'],
      severity: 'recommend',
      fix: `Replace each subscript named above with pickItem from ${PACKAGE_NAME}/candidate, which also takes a seed. It is not a silent substitution: pickItem throws on an empty array, where the subscript yields undefined and pushes the failure downstream. Where the bound is not the subject's own length, check the substitution before taking it: pickItem draws across the whole array, and a hand-written bound may have meant something narrower. Reference: ${README_URL}`,
    },
    {
      name: 'No source wraps a value in an array by hand',
      id: 'no-hand-rolled-arraify',
      kinds: ['arraify-inline'],
      severity: 'recommend',
      fix: `Replace each expression named above with arraify from ${PACKAGE_NAME}/candidate. Mind the aliasing: arraify always returns a new array, where a ternary handing the array branch straight back returns the caller's own array, and a later mutation of the result reaches it. The substitution is exact only where the array branch already spreads into a new array. Reference: ${README_URL}`,
    },
  ],
});
