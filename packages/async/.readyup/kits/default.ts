/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.async.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * The one check takes inventory rather than banning a pattern: A hand-rolled sleep is correct code that a
 * published utility expresses better, so it reports at `recommend`. Nothing here is `warn`, because none of it
 * is a defect.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSourceOrTest } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listSleepSites } from '../../src/readiness/listSleepSites.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.async';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/async#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listSleepSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside its bootstrap wrappers',
  packageName: PACKAGE_NAME,
  // The selection departs from the five source-oriented kits, which exempt tests on the ground that a test
  // writes their idioms deliberately. A test that sleeps is sleeping rather than exhibiting a form, and it is
  // where this idiom mostly lives, so a sweep exempting tests would report nothing in most projects.
  pathFilter: isAdoptableSourceOrTest,
  checks: [
    {
      name: 'No source sleeps by hand',
      id: 'no-hand-rolled-sleep',
      kinds: ['hand-rolled-sleep'],
      severity: 'recommend',
      fix: `Replace each promise named above with delay from ${PACKAGE_NAME}/candidate, whose promise carries a cancel that clears the timer and settles at once. A hand-rolled sleep hands back no such handle, so a caller that finishes early still waits out the whole delay, and in a test the pending timer holds the event loop open past the assertion that it was waiting for. Reference: ${README_URL}`,
    },
  ],
});
