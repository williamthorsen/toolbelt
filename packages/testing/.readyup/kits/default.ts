/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.testing.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * The one check takes inventory rather than banning a pattern: A capture written by hand is working code that
 * a published utility expresses better, so it reports at `recommend`. Nothing here is `warn`, because none of
 * it is a defect.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isTestFile } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listCaptureSites } from '../../src/readiness/listCaptureSites.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.testing';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/testing#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listCaptureSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no test files',
  packageName: PACKAGE_NAME,
  // The selection follows `toolbelt.vitest` rather than the five source-oriented kits: this idiom lives only
  // in a test, so a sweep exempting tests would report nothing and say so as a pass. No hand-off rule is
  // needed against the two kits whose sweeps could meet this one, since neither claims a try block:
  // `toolbelt.errors` exempts tests altogether, and `toolbelt.vitest` reads mocks and disposal hooks.
  pathFilter: isTestFile,
  checks: [
    {
      name: 'No test captures a thrown value by hand',
      id: 'no-hand-rolled-error-capture',
      kinds: ['hand-rolled-error-capture'],
      severity: 'recommend',
      fix: `Replace each capture named above with captureError from ${PACKAGE_NAME}/candidate, which runs the call, hands back what it threw or rejected with, and narrows that to a class the caller names. It fails the test where the call completes normally, so a regression that stops the failure reports itself instead of leaving a later assertion to report an absent value in its place, and the narrowing reaches the error's own fields without a second assertion to get there. Reference: ${README_URL}`,
    },
  ],
});
