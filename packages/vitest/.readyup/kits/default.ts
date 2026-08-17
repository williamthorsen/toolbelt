/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.vitest.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * the consumer has. Installing the package is the consent these checks rest on.
 *
 * The checks take inventory rather than banning a pattern, and severity carries the judgment. A mock that does
 * not throw is a `warn`, because it lets a suite cover a path the process never reaches; a hand-rolled
 * throwing mock is a `recommend`, being a substitution rather than a correction. Nothing here is `error`.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isTestFile } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listExitMocks } from '../../src/readiness/listExitMocks.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.vitest';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/vitest#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listExitMocks,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no test files',
  packageName: PACKAGE_NAME,
  // The selection inverts the one `toolbelt.errors` makes, which exempts tests. A `process.exit` mock exists
  // only in a test, so a sweep that skipped tests would report nothing and say so as a pass.
  pathFilter: isTestFile,
  checks: [
    {
      name: 'No test declares its own process-exit sentinel error',
      kinds: ['sentinel-clone'],
      fix: `Delete the class named above and use throwOnProcessExit from ${PACKAGE_NAME}/candidate, whose ProcessExitError carries the code. One substitution retires the class and the mock together. Reference: ${README_URL}`,
    },
    {
      name: 'No test mocks process.exit without throwing',
      kinds: ['non-throwing'],
      fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate. A mock that returns lets execution continue past the exit, so the test asserts against a path the process never reaches, and nothing reports it.`,
    },
    {
      name: 'No test hand-rolls a throwing or unreadable process-exit mock',
      kinds: ['throwing', 'unclassified'],
      severity: 'recommend',
      fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate, and assert the code on the thrown ProcessExitError. An unclassified mock is one these checks could not read: an implementation given as a bare reference, attached away from the spy's own call chain, or whose parentheses never balance.`,
    },
  ],
});
