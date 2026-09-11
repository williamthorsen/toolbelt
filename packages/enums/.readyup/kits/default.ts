/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.enums.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * The one check takes inventory rather than banning a pattern: A hand-rolled membership test is correct code that
 * a published guard expresses better, so it reports at `recommend`. Nothing here is `warn`, because none of it is a
 * defect.
 *
 * `toolbelt.arrays` publishes an `includes` of its own, but no kit reports an `includes` form, so this kit needs no
 * hand-off rule: A search of an enum's values belongs here.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listMembershipSites } from '../../src/readiness/listMembershipSites.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.enums';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/enums#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listMembershipSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test writes these forms deliberately, and a bootstrap wrapper hand-rolls what it checks so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source tests enum membership by hand',
      id: 'no-hand-rolled-enum-membership',
      kinds: ['values-includes'],
      severity: 'recommend',
      fix: `Replace each test named above with isEnumValue from ${PACKAGE_NAME}. It returns a type predicate, so the value narrows to a member of the enum wherever the test passes, which a search of the values does not do even with a cast added to satisfy the compiler. Where the test only chooses between the value and undefined, toEnumValue from the same package replaces the whole expression. Both accept only an object whose values are strings or numbers, so a search of an object with values of any other type has no substitution here. Reference: ${README_URL}`,
    },
  ],
});
