/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.testing.
 *
 * The kit is included in the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * The checks take inventory rather than banning a pattern: Because a thrown value or a stream's output captured by
 * hand is working code that a published utility expresses better, each check reports at `recommend`. Nothing here is
 * `warn`, because none of it is a defect.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isTestFile } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listSites } from '../../src/readiness/listSites.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.testing';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/testing#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project contains no test files',
  packageName: PACKAGE_NAME,
  // Only tests are swept: These idioms appear only in a test, so a sweep exempting tests would report nothing and
  // say so as a pass. No hand-off rule is needed against the two kits whose sweeps could overlap this one:
  // `toolbelt.errors` exempts tests altogether, and `toolbelt.vitest` claims no try block and anchors `vi.spyOn`
  // on `console` and `process.exit`, never on a stream.
  pathFilter: isTestFile,
  checks: [
    {
      name: 'No test captures a thrown value by hand',
      id: 'no-hand-rolled-error-capture',
      kinds: ['hand-rolled-error-capture'],
      severity: 'recommend',
      fix: `Replace each capture named above with captureError from ${PACKAGE_NAME}/candidate, which runs the call, hands back what it threw or rejected with, and narrows that to a class named by the caller. It fails the test when the call completes normally, so a regression that stops the failure reports itself instead of leaving a later assertion to report an absent value in its place, and the narrowing gives access to the error's own fields without a second assertion to get there. Reference: ${README_URL}`,
    },
    {
      name: 'No test captures stdout or stderr by hand',
      id: 'no-hand-rolled-stdio-capture',
      kinds: ['hand-rolled-stdio-capture'],
      severity: 'recommend',
      fix: `Replace each spy named above with captureStdio from ${PACKAGE_NAME}/candidate, binding it with using so that both streams are restored when the scope exits. Read the output from its stdout and stderr in place of each spy's mock.calls, or from stdoutChunks and stderrChunks when an assertion is about how the output was split into writes. Reference: ${README_URL}`,
    },
  ],
});
